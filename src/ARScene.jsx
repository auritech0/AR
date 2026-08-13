import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

export default function ARScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    let mindarThree = null;
    let started = false;

    const start = async () => {
      try {
        // =========================================
        // MINDAR
        // =========================================

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: "/ar/targets.mind",
        });

        const {
          renderer,
          scene,
          camera,
        } = mindarThree;

        console.log("✅ MindAR créé");

        // =========================================
        // ANCHOR
        // =========================================

        const anchor = mindarThree.addAnchor(0);

        console.log("✅ Anchor créé");

        // =========================================
        // CHARGEMENT DU LOGO
        // =========================================

        const textureLoader = new THREE.TextureLoader();

        console.log("⏳ Chargement du logo...");

        textureLoader.load(
          "/ar/models/auritech-logo.png",

          // =====================================
          // LOGO CHARGÉ
          // =====================================

          (texture) => {
            console.log("✅ LOGO CHARGÉ !");
            console.log(
              "📐 Dimensions :",
              texture.image.width,
              "x",
              texture.image.height
            );

            // =====================================
            // MATÉRIAU
            // =====================================

            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
              depthTest: false,
              depthWrite: false,
            });

            // =====================================
            // PLAN
            // =====================================

            const geometry = new THREE.PlaneGeometry(
              0.8,
              0.8
            );

            const logo = new THREE.Mesh(
              geometry,
              material
            );

            // =====================================
            // POSITION
            // =====================================

            logo.position.set(
              0,
              0,
              0.2
            );

            // =====================================
            // ROTATION
            // =====================================

            logo.rotation.set(
              0,
              0,
              0
            );

            // =====================================
            // VISIBILITÉ
            // =====================================

            logo.visible = true;

            // =====================================
            // AJOUT À L'ANCHOR
            // =====================================

            anchor.group.add(logo);

            // Sauvegarde de la référence
            anchor.userData.logo = logo;

            console.log(
              "🖼️ LOGO AJOUTÉ À L'ANCHOR"
            );
          },

          // =====================================
          // PROGRESSION
          // =====================================

          (progress) => {
            if (progress.total > 0) {
              const percent = Math.round(
                (progress.loaded / progress.total) * 100
              );

              console.log(
                `📥 Logo : ${percent}%`
              );
            }
          },

          // =====================================
          // ERREUR
          // =====================================

          (error) => {
            console.error(
              "❌ ERREUR CHARGEMENT LOGO",
              error
            );
          }
        );

        // =========================================
        // TARGET TROUVÉE
        // =========================================

        anchor.onTargetFound = () => {
          console.log("🎯 TARGET TROUVÉE");

          // Afficher l'interface
          const interfaceAR =
            document.getElementById(
              "ar-business-card"
            );

          if (interfaceAR) {
            interfaceAR.style.opacity = "1";
            interfaceAR.style.pointerEvents = "auto";
          }
        };

        // =========================================
        // TARGET PERDUE
        // =========================================

        anchor.onTargetLost = () => {
          console.log("❌ TARGET PERDUE");

          // Pour l'instant on garde
          // l'interface visible.
          //
          // Cela permettra plus tard
          // de mettre en place le système
          // des 10 secondes.

        };

        // =========================================
        // DÉMARRAGE
        // =========================================

        await mindarThree.start();

        started = true;

        console.log(
          "📷 CAMÉRA DÉMARRÉE"
        );

        // =========================================
        // RENDER
        // =========================================

        renderer.setAnimationLoop(() => {
          renderer.render(
            scene,
            camera
          );
        });

        console.log(
          "🎨 RENDERER DÉMARRÉ"
        );

      } catch (error) {
        console.error(
          "❌ ERREUR MINDAR :",
          error
        );
      }
    };

    start();

    // =========================================
    // NETTOYAGE
    // =========================================

    return () => {
      console.log(
        "🧹 Nettoyage AR"
      );

      if (
        mindarThree &&
        started
      ) {
        try {
          mindarThree.renderer.setAnimationLoop(
            null
          );

          mindarThree.stop();

        } catch (error) {
          console.warn(
            "⚠️ Erreur nettoyage :",
            error
          );
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* ========================================= */}
      {/* CARTE DE VISITE AR */}
      {/* ========================================= */}

      <div
        id="ar-business-card"
        style={{
          position: "absolute",

          bottom: "25px",

          left: "50%",

          transform: "translateX(-50%)",

          width: "90%",

          maxWidth: "420px",

          zIndex: 1000,

          opacity: "0",

          pointerEvents: "none",

          transition:
            "opacity 0.4s ease",
        }}
      >

        {/* ===================================== */}
        {/* INFORMATIONS */}
        {/* ===================================== */}

        <div
          style={{
            background:
              "rgba(0, 0, 0, 0.75)",

            backdropFilter:
              "blur(10px)",

            WebkitBackdropFilter:
              "blur(10px)",

            borderRadius: "18px",

            padding: "18px",

            color: "#ffffff",

            textAlign: "center",

            boxShadow:
              "0 8px 30px rgba(0,0,0,0.35)",

            border:
              "1px solid rgba(255,255,255,0.15)",
          }}
        >

          {/* NOM */}

          <div
            style={{
              fontSize: "22px",

              fontWeight: "700",

              marginBottom: "4px",
            }}
          >
            AuriTech
          </div>

          {/* MÉTIER */}

          <div
            style={{
              fontSize: "14px",

              opacity: "0.85",

              marginBottom: "14px",
            }}
          >
            Génie logiciel
          </div>

          {/* SERVICES */}

          <div
            style={{
              fontSize: "13px",

              lineHeight: "1.6",

              opacity: "0.9",

              marginBottom: "16px",
            }}
          >
            Développement Web • Mobile
            <br />
            Logiciels sur mesure
          </div>

          {/* ================================= */}
          {/* BOUTONS */}
          {/* ================================= */}

          <div
            style={{
              display: "flex",

              gap: "10px",
            }}
          >

            {/* WHATSAPP */}

            <a
              href="https://wa.me/24176516458"
              target="_blank"
              rel="noopener noreferrer"

              style={{
                flex: "1",

                padding: "13px 10px",

                borderRadius: "12px",

                background: "#25D366",

                color: "#ffffff",

                textDecoration: "none",

                fontSize: "14px",

                fontWeight: "700",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: "6px",
              }}
            >
              💬 WhatsApp
            </a>

            {/* APPEL */}

            <a
              href="tel:+24176516458"

              style={{
                flex: "1",

                padding: "13px 10px",

                borderRadius: "12px",

                background: "#2563EB",

                color: "#ffffff",

                textDecoration: "none",

                fontSize: "14px",

                fontWeight: "700",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: "6px",
              }}
            >
              📞 Appeler
            </a>

          </div>

        </div>

      </div>

    </div>
  );
}