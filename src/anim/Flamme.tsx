/** Flamme de régularité : vacille doucement quand elle est allumée, grise sinon. */
export function Flamme({ allumee = true }: { allumee?: boolean }) {
  return (
    <span class={`anim-flamme${allumee ? ' allumee' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path class="ext" d="M12 2c1 3.5 5.5 6 5.5 11.2A5.6 5.6 0 0 1 12 19a5.6 5.6 0 0 1-5.5-5.8c0-2.6 1.4-4 2.4-5.4.3 1.6 1 2.6 2 3C11.3 8 11 5 12 2Z" />
        <path class="int" d="M12 11.2c.7 1.6 2.6 2.6 2.6 4.6A2.6 2.6 0 0 1 12 18.4a2.6 2.6 0 0 1-2.6-2.6c0-1.4.9-2.2 1.6-3 .2.6.5 1 1 1.1-.3-1-.3-1.8 0-2.7Z" />
      </svg>
    </span>
  );
}
