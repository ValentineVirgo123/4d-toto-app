import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mascot } from './Mascot';

describe('Mascot — emoji rendering', () => {
  it('renders lion in idle state', () => {
    render(<Mascot state="idle" />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
  });

  it('renders lion in celebrating state with sparkle badge', () => {
    render(<Mascot state="celebrating" />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('renders lion in thinking state', () => {
    render(<Mascot state="thinking" />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
  });

  it('renders sleeping emoji in sleeping state with zzz badge', () => {
    render(<Mascot state="sleeping" />);
    expect(screen.getByText('😴')).toBeInTheDocument();
    expect(screen.getByText('💤')).toBeInTheDocument();
  });

  it('renders sad emoji in sad state', () => {
    render(<Mascot state="sad" />);
    expect(screen.getByText('🥺')).toBeInTheDocument();
  });

  it('defaults to idle when no state prop supplied', () => {
    render(<Mascot />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
  });
});

describe('Mascot — sizing', () => {
  it('applies size to the container width and height', () => {
    const { container } = render(<Mascot state="idle" size={120} />);
    const div = container.querySelector('div[style]');
    expect(div.style.width).toBe('120px');
    expect(div.style.height).toBe('120px');
  });

  it('defaults to 100px when no size supplied', () => {
    const { container } = render(<Mascot />);
    const div = container.querySelector('div[style]');
    expect(div.style.width).toBe('100px');
  });
});

describe('Mascot — CSS animations', () => {
  it('injects a <style> block with keyframe definitions', () => {
    const { container } = render(<Mascot state="idle" />);
    const styleEl = container.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('@keyframes mascot-float');
  });

  it('applies the correct animation for each state', () => {
    const cases = [
      ['idle',        'mascot-float'],
      ['celebrating', 'mascot-bounce'],
      ['thinking',    'mascot-pulse'],
      ['sleeping',    'mascot-breathe'],
      ['sad',         'mascot-droop'],
    ];

    for (const [state, keyword] of cases) {
      const { container } = render(<Mascot state={state} />);
      const div = container.querySelector('div[style]');
      expect(div.style.animation, `state=${state}`).toContain(keyword);
    }
  });
});
