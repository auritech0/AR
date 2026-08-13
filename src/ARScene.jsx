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

    let targetLostTimer = null;
    let targetIsLost = false;

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

        const textureLoader =
          new THREE.TextureLoader();

        console.log(
          "⏳ Chargement du logo..."
        );

        textureLoader.load(
          "/ar/models/auritech-logo.png",

          // =====================================
          // SUCCESS
          // =====================================

          (texture) => {
            console.log(
              "✅ LOGO CHARGÉ !"
            );

            console.log(
              "📐 Dimensions :",
              texture.image.width,
              "x",
              texture.image.height
            );

            // =====================================
            // MATÉRIAU
            // =====================================

            const material =
              new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
              });

            // =====================================
            // PLAN
            // =====================================

            const geometry =
              new THREE.PlaneGeometry(
                0.8,
                0.8
              );

            const logo =
              new THREE.Mesh(
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

            console.log(
              "🖼️ LOGO AJOUTÉ À L'ANCHOR"
            );

            console.log(
              "👁️ Logo visible :",
              logo.visible
            );

            // =====================================
            // TARGET FOUND
            // =====================================

            anchor.onTargetFound = () => {
              console.log(
                "🎯 TARGET TROUVÉE"
              );

              targetIsLost = false;

              // Annuler le timer précédent
              if (targetLostTimer) {
                clearTimeout(
                  targetLostTimer
                );

                targetLostTimer = null;
              }

              // Le logo redevient visible
              logo.visible = true;

              console.log(
                "🟢 Tracking repris"
              );
            };

            // =====================================
            // TARGET LOST
            // =====================================

            anchor.onTargetLost = () => {
              console.log(
                "❌ TARGET PERDUE"
              );

              targetIsLost = true;

              // On garde le logo visible
              logo.visible = true;

              console.log(
                "⏱️ Logo conservé pendant 10 secondes..."
              );

              // Annuler un éventuel ancien timer
              if (targetLostTimer) {
                clearTimeout(
                  targetLostTimer
                );
              }

              // =====================================
              // ATTENTE DE 10 SECONDES
              // =====================================

              targetLostTimer =
                setTimeout(() => {

                  // Vérifier que la cible
                  // n'a toujours pas été retrouvée
                  if (targetIsLost) {

                    console.log(
                      "⏰ 10 secondes écoulées"
                    );

                    console.log(
                      "🔴 Logo masqué"
                    );

                    logo.visible = false;
                  }

                  targetLostTimer = null;

                }, 10000);
            };
          },

          // =====================================
          // PROGRESSION
          // =====================================

          (progress) => {
            if (progress.total > 0) {

              const percent =
                Math.round(
                  (progress.loaded /
                    progress.total) *
                    100
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

          // =======================================
          // RENDU
          // =======================================

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

    // =========================================
    // START
    // =========================================

    start();

    // =========================================
    // NETTOYAGE
    // =========================================

    return () => {

      console.log(
        "🧹 Nettoyage AR"
      );

      // Annuler le timer
      if (targetLostTimer) {
        clearTimeout(
          targetLostTimer
        );

        targetLostTimer = null;
      }

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