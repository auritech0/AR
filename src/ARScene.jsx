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
        // =========================
        // MINDAR
        // =========================

        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: "/ar/targets.mind",
        });

        console.log("MindAR créé");

        const { renderer, scene, camera } = mindarThree;

        // =========================
        // LUMIÈRE
        // =========================

        const light = new THREE.HemisphereLight(
          0xffffff,
          0xbbbbff,
          1
        );

        scene.add(light);

        // =========================
        // ANCHOR
        // =========================

        const anchor = mindarThree.addAnchor(0);

        // =========================
        // CHARGEMENT DU LOGO
        // =========================

        const textureLoader = new THREE.TextureLoader();

        const logoTexture = textureLoader.load(
          "/ar/models/auritech-logo.png",
          () => {
            console.log("Logo AuriTech chargé");
          },
          undefined,
          (error) => {
            console.error(
              "Erreur chargement logo :",
              error
            );
          }
        );

        // =========================
        // MATÉRIAU DU LOGO
        // =========================

        const logoMaterial = new THREE.MeshBasicMaterial({
          map: logoTexture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        // =========================
        // PLAN 3D
        // =========================

        const logoGeometry = new THREE.PlaneGeometry(
          0.7,
          0.7
        );

        const logo = new THREE.Mesh(
          logoGeometry,
          logoMaterial
        );

        // Position au-dessus de la carte
        logo.position.set(
          0,
          0,
          0.15
        );

        anchor.group.add(logo);

        // =========================
        // DÉMARRAGE
        // =========================

        await mindarThree.start();

        started = true;

        console.log("CAMÉRA DÉMARRÉE");
        console.log(
          "Video:",
          mindarThree.video
        );

        // =========================
        // ANIMATION
        // =========================

        renderer.setAnimationLoop(() => {

          // Petite rotation
          logo.rotation.z =
            Math.sin(Date.now() * 0.001) * 0.03;

          // Effet flottant
          logo.position.y =
            Math.sin(Date.now() * 0.002) * 0.02;

          renderer.render(
            scene,
            camera
          );
        });

        console.log("RENDERER DÉMARRÉ");

      } catch (error) {
        console.error(
          "ERREUR MINDAR :",
          error
        );
      }
    };

    start();

    // =========================
    // NETTOYAGE
    // =========================

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