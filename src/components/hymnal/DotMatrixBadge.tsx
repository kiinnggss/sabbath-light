const DIGIT_MATRIX: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};

interface DotMatrixBadgeProps {
  number: number;
  size?: 'sm' | 'lg';
  padDigits?: boolean;
}

export function DotMatrixBadge({
  number,
  size = 'sm',
  padDigits = false,
}: DotMatrixBadgeProps) {
  const str = padDigits ? String(number).padStart(3, '0') : String(number);
  const chars = str.split('');

  const dotSize = size === 'lg' ? 3.2 : 2.1;
  const dotStep = size === 'lg' ? 4.4 : 2.9;
  const charGap = size === 'lg' ? 6 : 4;
  const charWidth = 5 * dotStep;
  const padX = size === 'lg' ? 8 : 5;
  const padY = size === 'lg' ? 7 : 4.5;

  const totalWidth =
    padX * 2 + chars.length * charWidth + Math.max(0, chars.length - 1) * charGap;
  const totalHeight = padY * 2 + 7 * dotStep;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-[var(--bezel-border)] bg-[var(--bezel-bg)] shadow-inner ${
        size === 'lg' ? 'rounded-xl px-2 py-1.5' : 'rounded-lg px-1 py-0.5'
      }`}
      aria-label={`Selection number ${number}`}
    >
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        aria-hidden="true"
        className="block"
      >
        {chars.map((ch, charIdx) => {
          const grid = DIGIT_MATRIX[ch] || DIGIT_MATRIX['0'];
          const offsetX = padX + charIdx * (charWidth + charGap);
          return grid.map((rowStr, rowIdx) =>
            rowStr.split('').map((bit, colIdx) => {
              const cx = offsetX + colIdx * dotStep + dotStep / 2;
              const cy = padY + rowIdx * dotStep + dotStep / 2;
              const isLit = bit === '1';
              return (
                <circle
                  key={`${charIdx}-${rowIdx}-${colIdx}`}
                  cx={cx}
                  cy={cy}
                  r={dotSize / 2}
                  fill={isLit ? 'var(--bezel-dot-on)' : 'var(--bezel-dot-off)'}
                />
              );
            }),
          );
        })}
      </svg>
    </span>
  );
}
