import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

export default function ARScene() {
  const containerRef = useRef(null);
  const mindarRef = useRef(null);

  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mindarThree = null;
    let animationId = null;
    let mounted = true;

    const start = async () => {
      try {
        const container = containerRef.current;

        if (!container) return;

        /*
         * --------------------------------------------------
         * MINDAR
         * --------------------------------------------------
         */

        mindarThree = new MindARThree({
          container,

          imageTargetSrc: "/ar/targets.mind",

          /*
           * Paramètres pour rendre le tracking plus fluide.
           */
          filterMinCF: 0.0001,
          filterBeta: 0.001,

          /*
           * Tolérance lorsque l'image est momentanément
           * perdue.
           */
          missTolerance: 8,
          warmupTolerance: 5,
        });

        mindarRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;

        /*
         * --------------------------------------------------
         * RENDERER
         * --------------------------------------------------
         */

        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );

        renderer.outputColorSpace = THREE.SRGBColorSpace;

        /*
         * --------------------------------------------------
         * SCENE
         * --------------------------------------------------
         */

        scene.background = null;

        /*
         * --------------------------------------------------
         * ANCHOR
         * --------------------------------------------------
         */

        const anchor = mindarThree.addAnchor(0);

        /*
         * --------------------------------------------------
         * GROUPE AR
         * --------------------------------------------------
         */

        const arGroup = new THREE.Group();

        anchor.group.add(arGroup);

        /*
         * --------------------------------------------------
         * HALO PRINCIPAL
         * --------------------------------------------------
         */

        const ringGeometry = new THREE.RingGeometry(
          0.34,
          0.37,
          64
        );

        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const ring = new THREE.Mesh(
          ringGeometry,
          ringMaterial
        );

        ring.position.set(0, 0, 0.05);

        arGroup.add(ring);

        /*
         * --------------------------------------------------
         * SECOND HALO
         * --------------------------------------------------
         */

        const outerRingGeometry = new THREE.RingGeometry(
          0.46,
          0.465,
          64
        );

        const outerRingMaterial =
          new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
          });

        const outerRing = new THREE.Mesh(
          outerRingGeometry,
          outerRingMaterial
        );

        outerRing.position.set(0, 0, 0.04);

        arGroup.add(outerRing);

        /*
         * --------------------------------------------------
         * PETITES PARTICULES
         * --------------------------------------------------
         */

        const particleCount = 30;

        const particlePositions = new Float32Array(
          particleCount * 3
        );

        for (let i = 0; i < particleCount; i++) {
          const angle =
            (i / particleCount) * Math.PI * 2;

          const radius =
            0.45 + Math.random() * 0.18;

          particlePositions[i * 3] =
            Math.cos(angle) * radius;

          particlePositions[i * 3 + 1] =
            Math.sin(angle) * radius;

          particlePositions[i * 3 + 2] = 0.06;
        }

        const particlesGeometry =
          new THREE.BufferGeometry();

        particlesGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(
            particlePositions,
            3
          )
        );

        const particlesMaterial =
          new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.025,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
          });

        const particles = new THREE.Points(
          particlesGeometry,
          particlesMaterial
        );

        arGroup.add(particles);

        /*
         * --------------------------------------------------
         * LOGO
         * --------------------------------------------------
         *
         * Petit logo seulement.
         * Il ne prend plus tout l'écran.
         */

        const textureLoader =
          new THREE.TextureLoader();

        textureLoader.load(
          "/ar/models/auritech-logo.png",
          (texture) => {
            if (!mounted) return;

            texture.colorSpace =
              THREE.SRGBColorSpace;

            const image =
              texture.image;

            const aspect =
              image.width / image.height;

            const height = 0.22;

            const width =
              height * aspect;

            const logoGeometry =
              new THREE.PlaneGeometry(
                width,
                height
              );

            const logoMaterial =
              new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
              });

            const logo =
              new THREE.Mesh(
                logoGeometry,
                logoMaterial
              );

            logo.position.set(
              0,
              0,
              0.08
            );

            arGroup.add(logo);
          },
          undefined,
          (error) => {
            console.warn(
              "Logo impossible à charger :",
              error
            );
          }
        );

        /*
         * --------------------------------------------------
         * ETAT INITIAL
         * --------------------------------------------------
         */

        arGroup.visible = false;

        /*
         * --------------------------------------------------
         * TARGET FOUND
         * --------------------------------------------------
         */

        anchor.onTargetFound = () => {
          if (!mounted) return;

          arGroup.visible = true;

          setDetected(true);
        };

        /*
         * --------------------------------------------------
         * TARGET LOST
         * --------------------------------------------------
         */

        anchor.onTargetLost = () => {
          if (!mounted) return;

          arGroup.visible = false;

          setDetected(false);
        };

        /*
         * --------------------------------------------------
         * DEMARRAGE
         * --------------------------------------------------
         */

        await mindarThree.start();

        if (!mounted) return;

        setLoading(false);

        /*
         * --------------------------------------------------
         * ANIMATION
         * --------------------------------------------------
         */

        const clock = new THREE.Clock();

        renderer.setAnimationLoop(() => {
          const elapsed =
            clock.getElapsedTime();

          /*
           * Rotation douce du halo.
           */

          ring.rotation.z =
            elapsed * 0.35;

          outerRing.rotation.z =
            -elapsed * 0.18;

          particles.rotation.z =
            elapsed * 0.12;

          /*
           * Respiration légère.
           */

          const pulse =
            1 +
            Math.sin(elapsed * 2.5) *
              0.035;

          ring.scale.set(
            pulse,
            pulse,
            pulse
          );

          /*
           * Opacité dynamique.
           */

          ringMaterial.opacity =
            0.65 +
            Math.sin(elapsed * 2.5) *
              0.15;

          renderer.render(
            scene,
            camera
          );
        });
      } catch (error) {
        console.error(
          "Erreur démarrage AR :",
          error
        );

        setLoading(false);
      }
    };

    start();

    /*
     * ----------------------------------------------------
     * RESIZE
     * ----------------------------------------------------
     */

    const handleResize = () => {
      if (!mindarThree) return;

      const renderer =
        mindarThree.renderer;

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          2
        )
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    /*
     * ----------------------------------------------------
     * CLEANUP
     * ----------------------------------------------------
     */

    return () => {
      mounted = false;

      window.removeEventListener(
        "resize",
        handleResize
      );

      if (mindarThree) {
        try {
          mindarThree.renderer.setAnimationLoop(
            null
          );

          mindarThree.stop();

          mindarThree.renderer.dispose();
        } catch (error) {
          console.warn(
            "Erreur nettoyage AR :",
            error
          );
        }
      }

      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="ar-container"
    >
      {/* ---------------------------------------------
          OVERLAY INTERFACE
      --------------------------------------------- */}

      <div
        className={`ar-interface ${
          detected ? "is-visible" : ""
        }`}
      >
        <div className="ar-glass-card">

          {/* TOP */}

          <div className="ar-profile">

            <div className="ar-avatar">
              <span>A</span>
            </div>

            <div className="ar-profile-info">
              <div className="ar-name">
                AuriTech
              </div>

              <div className="ar-role">
                Ingénierie informatique
              </div>
            </div>

            <div className="ar-status">
              <span />
              CONNECTÉ
            </div>
          </div>

          {/* DIVIDER */}

          <div className="ar-divider" />

          {/* DESCRIPTION */}

          <div className="ar-description">
            <strong>
              Solutions numériques sur mesure.
            </strong>

            <span>
              Développement Web · Mobile · Logiciels
            </span>
          </div>

          {/* ACTIONS */}

          <div className="ar-actions">

            <a
              href="https://wa.me/24176516458"
              target="_blank"
              rel="noopener noreferrer"
              className="ar-action ar-whatsapp"
            >
              <div className="ar-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-4-.9L3 20l1.2-4.7A8.4 8.4 0 1 1 21 11.5Z" />
                  <path d="M8.5 9.5c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.5c.1.2.1.4 0 .6l-.4.5c-.1.2-.1.4 0 .6.4.7 1 1.3 1.7 1.7.2.1.4.1.6 0l.5-.4c.2-.1.4-.1.6 0l1.5.7c.2.1.3.3.3.5v.5c0 .3-.1.5-.5.7-.4.2-1 .3-1.5.1-1-.3-2.2-1-3.2-2-1-.9-1.7-2.1-2-3.1-.2-.6-.1-1.2.1-1.6Z" />
                </svg>
              </div>

              <div>
                <strong>
                  WhatsApp
                </strong>

                <span>
                  Nous contacter
                </span>
              </div>

              <div className="ar-arrow">
                →
              </div>
            </a>

            <a
              href="tel:+24176516458"
              className="ar-action ar-call"
            >
              <div className="ar-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
                </svg>
              </div>

              <div>
                <strong>
                  Appeler
                </strong>

                <span>
                  +241 76 51 64 58
                </span>
              </div>

              <div className="ar-arrow">
                →
              </div>
            </a>

          </div>

          {/* FOOTER */}

          <div className="ar-footer">
            <span>
              AURITECH
            </span>

            <span>
              TECHNOLOGY
            </span>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------
          SCAN UI
      --------------------------------------------- */}

      <div
        className={`ar-scanner ${
          detected
            ? "scanner-hidden"
            : ""
        }`}
      >

        <div className="ar-scanner-title">
          {loading
            ? "INITIALISATION..."
            : "SCANNEZ LA CARTE"}
        </div>

        <div className="scanner-frame">
          <div className="corner top-left" />
          <div className="corner top-right" />
          <div className="corner bottom-left" />
          <div className="corner bottom-right" />

          <div className="scanner-line" />
        </div>

        <div className="ar-scanner-subtitle">
          Placez la carte dans le cadre
        </div>

      </div>

      {/* ---------------------------------------------
          DETECTED BADGE
      --------------------------------------------- */}

      <div
        className={`ar-detected ${
          detected
            ? "detected-visible"
            : ""
        }`}
      >
        <span className="detected-dot" />
        CARTE DÉTECTÉE
      </div>

    </div>
  );
}