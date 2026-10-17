import { describe, expect, it } from 'vitest';
import { InputManager } from '../src/combat/InputManager';

describe('gestor de entrada', () => {
  it('mantiene la tecla presionada y detecta pulsaciones nuevas con buffer', () => {
    const im = new InputManager();
    im.setKey('Space', true);
    im.update();
    let s = im.snapshot(1);
    expect(s.light).toBe(true);
    expect(s.pressed.light).toBe(true);
    for (let i = 0; i < 10; i++) im.update();
    s = im.snapshot(1);
    expect(s.light).toBe(true);
    expect(s.pressed.light).toBe(false);
    im.setKey('Space', false);
    im.update();
    expect(im.snapshot(1).light).toBe(false);
  });
  it('separa a los dos jugadores', () => {
    const im = new InputManager();
    im.setKey('Numpad4', true);
    im.update();
    expect(im.snapshot(1).left).toBe(false);
    expect(im.snapshot(2).left).toBe(true);
  });
  it('limpia todo al perder el foco', () => {
    const im = new InputManager();
    im.setKey('ArrowLeft', true);
    im.update();
    expect(im.snapshot(1).left).toBe(true);
    im.clearAll();
    im.update();
    expect(im.snapshot(1).left).toBe(false);
  });
  it('controles por defecto: flechas para moverse y ESPACIO para golpear', () => {
    const im = new InputManager();
    for (const [code, action] of [['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down'], ['Space', 'light'], ['KeyZ', 'lightkick'], ['KeyX', 'heavy'], ['KeyC', 'heavykick'], ['KeyA', 'special'], ['KeyS', 'ultimate'], ['KeyD', 'block']] as const) {
      im.setKey(code, true);
      im.update();
      expect(im.snapshot(1)[action]).toBe(true);
      im.setKey(code, false);
      im.update();
    }
  });
});
