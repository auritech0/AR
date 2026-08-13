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
        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: "/ar/targets.mind",
        });

        const { renderer, scene, camera } = mindarThree;
        const anchor = mindarThree.addAnchor(0);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          "/ar/models/auritech-logo.png",
          (texture) => {
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
              depthTest: false,
              depthWrite: false,
            });
            const geometry = new THREE.PlaneGeometry(0.8, 0.8);
            const logo = new THREE.Mesh(geometry, material);
            logo.position.set(0, 0, 0.2);
            logo.visible = true;
            anchor.group.add(logo);
            anchor.userData.logo = logo;
          },
          undefined,
          (error) => console.error("Erreur chargement logo :", error)
        );

        anchor.onTargetFound = () => {
          const card = document.getElementById("ar-business-card");
          if (card) {
            card.classList.add("ar-card-visible");
          }
        };

        anchor.onTargetLost = () => {
          // Interface conservée à l'écran pour l'instant
        };

        await mindarThree.start();
        started = true;

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      } catch (error) {
        console.error("Erreur MindAR :", error);
      }
    };

    start();

    return () => {
      if (mindarThree && started) {
        try {
          mindarThree.renderer.setAnimationLoop(null);
          mindarThree.stop();
        } catch (error) {
          console.warn("Erreur nettoyage :", error);
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="ar-container">
      <style>{`
        .ar-container {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .ar-card {
          position: absolute;
          bottom: max(24px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translate(-50%, 16px);
          width: min(92%, 400px);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.45s ease, transform 0.45s ease;
        }

        .ar-card-visible {
          opacity: 1;
          transform: translate(-50%, 0);
          pointer-events: auto;
        }

        .ar-card-inner {
          background: linear-gradient(180deg, rgba(20, 20, 24, 0.82), rgba(10, 10, 12, 0.88));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 24px 22px;
          color: #ffffff;
          text-align: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .ar-card-name {
          font-size: 21px;
          font-weight: 700;
          letter-spacing: 0.2px;
          margin-bottom: 3px;
        }

        .ar-card-role {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 16px;
        }

        .ar-card-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 0 16px;
        }

        .ar-card-services {
          font-size: 13.5px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 20px;
        }

        .ar-card-actions {
          display: flex;
          gap: 10px;
        }

        .ar-btn {
          flex: 1;
          padding: 13px 10px;
          border-radius: 13px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .ar-btn:active {
          transform: scale(0.96);
        }

        .ar-btn-whatsapp {
          background: #25d366;
          color: #ffffff;
        }

        .ar-btn-whatsapp:hover {
          filter: brightness(1.08);
        }

        .ar-btn-call {
          background: #2563eb;
          color: #ffffff;
        }

        .ar-btn-call:hover {
          filter: brightness(1.1);
        }
      `}</style>

      <div id="ar-business-card" className="ar-card">
        <div className="ar-card-inner">
          <div className="ar-card-name">AuriTech</div>
          <div className="ar-card-role">Génie logiciel</div>
          <div className="ar-card-divider" />
          <div className="ar-card-services">
            Développement Web • Mobile
            <br />
            Logiciels sur mesure
          </div>
          <div className="ar-card-actions">
            
              href="https://wa.me/24176516458"
              target="_blank"
              rel="noopener noreferrer"
              className="ar-btn ar-btn-whatsapp"
            >
              💬 WhatsApp
            </a>
            <a href="tel:+24176516458" className="ar-btn ar-btn-call">
              📞 Appeler
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}