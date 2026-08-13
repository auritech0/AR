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

        console.log("MindAR créé");

        const { renderer, scene, camera } = mindarThree;

        // -------------------------
        // LUMIÈRE
        // -------------------------

        const light = new THREE.HemisphereLight(
          0xffffff,
          0xbbbbff,
          2
        );

        scene.add(light);

        // -------------------------
        // ANCHOR
        // -------------------------

        const anchor = mindarThree.addAnchor(0);

        // -------------------------
        // CUBE TEST
        // -------------------------

        const geometry = new THREE.BoxGeometry(
          0.35,
          0.35,
          0.35
        );

        const material = new THREE.MeshNormalMaterial();

        const cube = new THREE.Mesh(
          geometry,
          material
        );

        cube.position.set(
          0,
          0,
          0.2
        );

        anchor.group.add(cube);

        console.log("Cube ajouté à l'anchor");

        // -------------------------
        // DÉTECTION
        // -------------------------

        anchor.onTargetFound = () => {
          console.log("🎯 TARGET TROUVÉE !");
          cube.visible = true;
        };

        anchor.onTargetLost = () => {
          console.log("❌ TARGET PERDUE");
          cube.visible = false;
        };

        // -------------------------
        // DÉMARRAGE
        // -------------------------

        await mindarThree.start();

        started = true;

        console.log("📷 CAMÉRA DÉMARRÉE");

        // -------------------------
        // RENDER
        // -------------------------

        renderer.setAnimationLoop(() => {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;

          renderer.render(
            scene,
            camera
          );
        });

        console.log("🎨 RENDERER DÉMARRÉ");

      } catch (error) {
        console.error(
          "❌ ERREUR MINDAR :",
          error
        );
      }
    };

    start();

    // -------------------------
    // NETTOYAGE
    // -------------------------

    return () => {
      console.log("Nettoyage AR");

      if (mindarThree && started) {
        try {
          mindarThree.renderer.setAnimationLoop(null);
          mindarThree.stop();
        } catch (error) {
          console.warn(
            "Erreur nettoyage MindAR :",
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
    />
  );
}