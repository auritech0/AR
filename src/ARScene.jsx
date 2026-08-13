import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js";

export default function ARScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    let mindarThree = null;
    let started = false;

    // =========================================
    // VARIABLES DE TRACKING
    // =========================================

    let hasBeenFound = false; // le logo a-t-il déjà été détecté au moins une fois ?
    let anchorRef = null;

    const start = async () => {
      try {
        // =========================================
        // MINDAR
        // =========================================

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: "/ar/targets.mind",
        });

        const { renderer, scene, camera } = mindarThree;

        console.log("✅ MindAR créé");

        // =========================================
        // ANCHOR
        // =========================================

        const anchor = mindarThree.addAnchor(0);
        anchorRef = anchor;

        console.log("✅ Anchor créé");

        // =========================================
        // CHARGEMENT DU LOGO
        // =========================================

        const textureLoader = new THREE.TextureLoader();

        console.log("⏳ Chargement du logo...");

        textureLoader.load(
          "/ar/models/auritech-logo.png",

          // =====================================
          // SUCCESS
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

            const geometry = new THREE.PlaneGeometry(0.8, 0.8);
            const logo = new THREE.Mesh(geometry, material);

            // =====================================
            // POSITION / ROTATION / VISIBILITÉ
            // =====================================

            logo.position.set(0, 0, 0.2);
            logo.rotation.set(0, 0, 0);
            logo.visible = true;

            // =====================================
            // AJOUT À L'ANCHOR
            // =====================================

            anchor.group.add(logo);

            console.log("🖼️ LOGO AJOUTÉ À L'ANCHOR");
            console.log("👁️ Logo visible :", logo.visible);

            // =====================================
            // TARGET FOUND
            // =====================================

            anchor.onTargetFound = () => {
              console.log("🎯 TARGET TROUVÉE");
              hasBeenFound = true;
              logo.visible = true;
              console.log("🟢 Tracking repris");
            };

            // =====================================
            // TARGET LOST
            // =====================================
            // On garde volontairement le logo affiché,
            // même quand la cible sort du champ de la caméra.
            // La visibilité réelle est forcée dans la boucle
            // de rendu (voir renderer.setAnimationLoop plus bas),
            // car MindAR écrase anchor.group.visible à chaque frame.

            anchor.onTargetLost = () => {
              console.log("❌ TARGET PERDUE — logo conservé indéfiniment");
              logo.visible = true;
            };
          },

          // =====================================
          // PROGRESSION
          // =====================================

          (progress) => {
            if (progress.total > 0) {
              const percent = Math.round(
                (progress.loaded / progress.total) * 100
              );
              console.log(`📥 Logo : ${percent}%`);
            }
          },

          // =====================================
          // ERREUR
          // =====================================

          (error) => {
            console.error("❌ ERREUR CHARGEMENT LOGO", error);
          }
        );

        // =========================================
        // DÉMARRAGE
        // =========================================

        await mindarThree.start();
        started = true;

        console.log("📷 CAMÉRA DÉMARRÉE");

        // =========================================
        // RENDER
        // =========================================

        renderer.setAnimationLoop(() => {
          // MindAR remet anchor.group.visible à false dès que le
          // tracking est perdu. On le force à true dès que la target
          // a été trouvée au moins une fois, pour que le logo reste
          // affiché même quand on éloigne la caméra de l'image.
          if (anchorRef && hasBeenFound) {
            anchorRef.group.visible = true;
          }

          renderer.render(scene, camera);
        });

        console.log("🎨 RENDERER DÉMARRÉ");
      } catch (error) {
        console.error("❌ ERREUR MINDAR :", error);
      }
    };

    // =========================================
    // START
    // =========================================

    start();

    // =========================================
    // NETTOYAGE
    // =========================================

    return () => {
      console.log("🧹 Nettoyage AR");

      if (mindarThree && started) {
        try {
          mindarThree.renderer.setAnimationLoop(null);
          mindarThree.stop();
        } catch (error) {
          console.warn("⚠️ Erreur nettoyage :", error);
        }
      }
    };
  }, []);

  // =========================================
  // CONTENEUR AR
  // =========================================

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}