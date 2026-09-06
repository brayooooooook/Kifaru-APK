import * as THREE from 'three';
import { TRAILER } from '../core/config';

export function buildBoxTrailer(cargoColor = 0xc8a24a) {
  const g = new THREE.Group();
  g.name = 'BoxTrailer';
  const frame = new THREE.MeshStandardMaterial({ color: 0x33363c, metalness: 0.6, roughness: 0.4 });
  const boxM = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.65, metalness: 0.05 });
  const stripe = new THREE.MeshStandardMaterial({ color: cargoColor, roughness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(TRAILER.width, 0.18, TRAILER.length), frame);
  deck.position.y = 1.15;
  deck.castShadow = true;
  g.add(deck);

  const body = new THREE.Mesh(new THREE.BoxGeometry(TRAILER.width - 0.05, 2.6, TRAILER.length - 0.3), boxM);
  body.position.y = 2.5;
  body.castShadow = true;
  g.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(TRAILER.width + 0.02, 0.35, TRAILER.length - 0.2), stripe);
  band.position.y = 2.5;
  g.add(band);

  const king = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8), frame);
  king.position.set(0, 1.0, TRAILER.kingpinZ);
  g.add(king);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.12), frame);
  legs.position.set(0, 0.55, 2.2);
  g.add(legs);

  const wheels: THREE.Group[] = [];
  const addW = (x: number, z: number) => {
    const grp = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 12), rubber);
    t.rotation.z = Math.PI / 2;
    t.castShadow = true;
    grp.add(t);
    grp.position.set(x, 0.5, z);
    g.add(grp);
    wheels.push(grp);
  };
  for (const z of TRAILER.axlesZ) {
    addW(-1.05, z);
    addW(1.05, z);
  }

  const sign = makeSign('MAVUNO GRAIN  ·  MAIZE');
  sign.position.set(0, 2.7, -TRAILER.length / 2 + 0.02);
  g.add(sign);

  return { group: g, wheels };
}

function makeSign(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5a1c24';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#f0e6c8';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 42);
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), m);
}

export function buildTrailerVariant(kind: string) {
  const { group, wheels } = buildBoxTrailer(kind === 'tanker' ? 0x446688 : kind === 'reefer' ? 0x88aacc : 0xc8a24a);
  if (kind === 'flatbed') {
    group.children.forEach((ch) => {
      if (ch instanceof THREE.Mesh && ch.geometry instanceof THREE.BoxGeometry) {
        const p = ch.geometry.parameters;
        if (p.height > 2) ch.visible = false;
      }
    });
  }
  return { group, wheels };
}
