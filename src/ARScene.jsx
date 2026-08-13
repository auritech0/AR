import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

const LOGO_STORAGE_KEY = "ar_logo_transform_v1";
const CARD_STORAGE_KEY = "ar_card_pos_v1";
const PX_TO_UNIT = 0.0035; // sensibilité du drag du logo (px écran -> unités 3D)

const defaultLogoTransform = { x: 0, y: 0, scale: 1, rotation: 0 };

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible, on ignore silencieusement
  }
}

export default function ARScene() {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const anchorRef = useRef(null);
  const foundOnceRef = useRef(false);

  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState("logo"); // "logo" | "card"
  const [logoTransform, setLogoTransform] = useState(() =>
    loadJSON(LOGO_STORAGE_KEY, defaultLogoTransform)
  );

  const [cardPos, setCardPos] = useState(() =>
    loadJSON(CARD_STORAGE_KEY, null)
  );

  const logoTransformRef = useRef(logoTransform);
  logoTransformRef.current = logoTransform;

  // Position par défaut de la carte, calculée une fois le viewport connu
  useEffect(() => {
    if (cardPos === null) {
      const defaultPos = {
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.7,
      };
      setCardPos(defaultPos);
    }
  }, [cardPos]);

  // Applique le transform stocké au mesh du logo dès qu'il existe
  const applyLogoTransform = useCallback((t) => {
    const logo = logoRef.current;
    if (!logo) return;
    logo.position.x = t.x;
    logo.position.y = t.y;
    logo.scale.set(t.scale, t.scale, t.scale);
    logo.rotation.z = t.rotation;
  }, []);

  useEffect(() => {
    applyLogoTransform(logoTransform);
    saveJSON(LOGO_STORAGE_KEY, logoTransform);
  }, [logoTransform, applyLogoTransform]);

  useEffect(() => {
    if (cardPos) saveJSON(CARD_STORAGE_KEY, cardPos);
  }, [cardPos]);

  // ============================================
  // INITIALISATION MINDAR / THREE
  // ============================================
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
        anchorRef.current = anchor;

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
            logoRef.current = logo;

            // Réapplique la position/échelle/rotation sauvegardées
            applyLogoTransform(logoTransformRef.current);
          },
          undefined,
          (error) => console.error("Erreur chargement logo :", error)
        );

        anchor.onTargetFound = () => {
          foundOnceRef.current = true;
          const card = document.getElementById("ar-business-card");
          if (card) card.classList.add("ar-card-visible");
        };

        anchor.onTargetLost = () => {
          // On garde le logo et la carte affichés (voir boucle de rendu ci-dessous)
        };

        await mindarThree.start();
        started = true;

        renderer.setAnimationLoop(() => {
          // Force le logo à rester visible même après perte de la cible,
          // au lieu de laisser MindAR le masquer automatiquement.
          if (foundOnceRef.current && anchor.group) {
            anchor.group.visible = true;
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // DRAG DU LOGO (mode édition)
  // ============================================
  const logoDragState = useRef(null);

  const handleLogoPointerDown = (e) => {
    if (!editMode || editTarget !== "logo") return;
    logoDragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...logoTransformRef.current },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLogoPointerMove = (e) => {
    if (!logoDragState.current) return;
    const { startX, startY, origin } = logoDragState.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setLogoTransform({
      ...origin,
      x: origin.x + dx * PX_TO_UNIT,
      y: origin.y - dy * PX_TO_UNIT, // écran vers le bas = 3D vers le bas
    });
  };

  const handleLogoPointerUp = () => {
    logoDragState.current = null;
  };

  // ============================================
  // DRAG DE LA CARTE (mode édition)
  // ============================================
  const cardDragState = useRef(null);

  const handleCardHandlePointerDown = (e) => {
    if (!editMode || editTarget !== "card" || !cardPos) return;
    cardDragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...cardPos },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCardHandlePointerMove = (e) => {
    if (!cardDragState.current) return;
    const { startX, startY, origin } = cardDragState.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setCardPos({ x: origin.x + dx, y: origin.y + dy });
  };

  const handleCardHandlePointerUp = () => {
    cardDragState.current = null;
  };

  const resetLogo = () => setLogoTransform(defaultLogoTransform);
  const resetCard = () =>
    setCardPos({ x: window.innerWidth / 2, y: window.innerHeight * 0.7 });

  const nudgeScale = (delta) =>
    setLogoTransform((t) => ({
      ...t,
      scale: Math.max(0.2, Math.min(3, t.scale + delta)),
    }));

  const nudgeRotation = (deltaDeg) =>
    setLogoTransform((t) => ({
      ...t,
      rotation: t.rotation + (deltaDeg * Math.PI) / 180,
    }));

  return (
    <div ref={containerRef} className="ar-container">
      <style>{`
        .ar-container {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
          touch-action: none;
        }

        /* ---------- overlay de drag pour le logo ---------- */
        .ar-logo-drag-overlay {
          position: absolute;
          inset: 0;
          z-index: 900;
          cursor: grab;
          background: rgba(37, 99, 235, 0.05);
        }
        .ar-logo-drag-overlay:active {
          cursor: grabbing;
        }

        /* ---------- bouton mode édition ---------- */
        .ar-edit-toggle {
          position: absolute;
          top: max(16px, env(safe-area-inset-top));
          right: 16px;
          z-index: 1100;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #fff;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(0,0,0,0.35);
        }
        .ar-edit-toggle.active {
          background: #2563EB;
          border-color: #2563EB;
        }

        /* ---------- panneau d'édition ---------- */
        .ar-edit-panel {
          position: absolute;
          top: max(70px, calc(env(safe-area-inset-top) + 70px));
          right: 16px;
          z-index: 1100;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 14px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          border: 1px solid rgba(255,255,255,0.12);
          width: 200px;
        }

        .ar-edit-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
        }

        .ar-edit-tab {
          flex: 1;
          padding: 8px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }

        .ar-edit-tab.active {
          background: #2563EB;
          border-color: #2563EB;
        }

        .ar-edit-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .ar-edit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .ar-edit-btns {
          display: flex;
          gap: 6px;
        }

        .ar-mini-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ar-reset-btn {
          width: 100%;
          margin-top: 6px;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }

        /* ---------- carte AR ---------- */
        .ar-card {
          position: absolute;
          left: 0;
          top: 0;
          transform: translate(-50%, -50%) translateY(16px);
          width: min(92%, 400px);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.45s ease, transform 0.45s ease;
        }

        .ar-card-visible {
          opacity: 1;
          transform: translate(-50%, -50%) translateY(0);
          pointer-events: auto;
        }

        .ar-card-inner {
          background: linear-gradient(180deg, rgba(20, 20, 24, 0.82), rgba(10, 10, 12, 0.88));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 18px 22px 22px;
          color: #ffffff;
          text-align: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .ar-card-handle {
          width: 40px;
          height: 5px;
          border-radius: 3px;
          background: rgba(255,255,255,0.3);
          margin: 0 auto 14px;
        }

        .ar-card-handle.draggable {
          background: #2563EB;
          cursor: grab;
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

        .ar-btn-call {
          background: #2563eb;
          color: #ffffff;
        }
      `}</style>

      {/* Bouton pour activer/désactiver le mode édition */}
      <button
        className={`ar-edit-toggle ${editMode ? "active" : ""}`}
        onClick={() => setEditMode((v) => !v)}
        aria-label="Mode édition"
      >
        ✏️
      </button>

      {editMode && (
        <div className="ar-edit-panel">
          <div className="ar-edit-tabs">
            <button
              className={`ar-edit-tab ${editTarget === "logo" ? "active" : ""}`}
              onClick={() => setEditTarget("logo")}
            >
              Logo
            </button>
            <button
              className={`ar-edit-tab ${editTarget === "card" ? "active" : ""}`}
              onClick={() => setEditTarget("card")}
            >
              Carte
            </button>
          </div>

          {editTarget === "logo" ? (
            <>
              <div className="ar-edit-hint">
                Glisse n'importe où sur l'écran pour déplacer le logo sur la cible.
              </div>
              <div className="ar-edit-row">
                <span>Taille</span>
                <div className="ar-edit-btns">
                  <button className="ar-mini-btn" onClick={() => nudgeScale(-0.1)}>−</button>
                  <button className="ar-mini-btn" onClick={() => nudgeScale(0.1)}>+</button>
                </div>
              </div>
              <div className="ar-edit-row">
                <span>Rotation</span>
                <div className="ar-edit-btns">
                  <button className="ar-mini-btn" onClick={() => nudgeRotation(-15)}>↺</button>
                  <button className="ar-mini-btn" onClick={() => nudgeRotation(15)}>↻</button>
                </div>
              </div>
              <button className="ar-reset-btn" onClick={resetLogo}>
                Réinitialiser le logo
              </button>
            </>
          ) : (
            <>
              <div className="ar-edit-hint">
                Glisse la carte (barre bleue en haut de la carte) pour la placer où tu veux.
              </div>
              <button className="ar-reset-btn" onClick={resetCard}>
                Réinitialiser la carte
              </button>
            </>
          )}
        </div>
      )}

      {/* Zone de drag transparente pour repositionner le logo 3D */}
      {editMode && editTarget === "logo" && (
        <div
          className="ar-logo-drag-overlay"
          onPointerDown={handleLogoPointerDown}
          onPointerMove={handleLogoPointerMove}
          onPointerUp={handleLogoPointerUp}
          onPointerCancel={handleLogoPointerUp}
        />
      )}

      {/* Carte AR */}
      {cardPos && (
        <div
          id="ar-business-card"
          className="ar-card"
          style={{ left: cardPos.x, top: cardPos.y }}
        >
          <div className="ar-card-inner">
            <div
              className={`ar-card-handle ${editMode && editTarget === "card" ? "draggable" : ""}`}
              onPointerDown={handleCardHandlePointerDown}
              onPointerMove={handleCardHandlePointerMove}
              onPointerUp={handleCardHandlePointerUp}
              onPointerCancel={handleCardHandlePointerUp}
            />
            <div className="ar-card-name">AuriTech</div>
            <div className="ar-card-role">Génie logiciel</div>
            <div className="ar-card-divider" />
            <div className="ar-card-services">
              Développement Web • Mobile
              <br />
              Logiciels sur mesure
            </div>
            <div className="ar-card-actions">
            <a  
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
      )}
    </div>
  );
}