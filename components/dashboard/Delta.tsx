import './Delta.css';

type DeltaProps = {
  value: string;
  alternative?: string;
  expanded?: boolean;
  onToggle?: () => void;
  onBlur?: () => void;
  ariaLabel?: string;
};

function splitValue(value: string) {
  const suffixMatch = value.match(/(\s*(?:%|Stk\.))$/);
  const withoutSuffix = suffixMatch ? value.slice(0, -suffixMatch[1].length) : value;
  const sign = withoutSuffix.match(/^[+-]/)?.[0] ?? '';
  return {sign, number: withoutSuffix.slice(sign.length), suffix: suffixMatch?.[1]?.trim() ?? ''};
}

export function Delta({value, alternative, expanded = false, onToggle, onBlur, ariaLabel}: DeltaProps) {
  const parts = splitValue(value);
  const content = <>
    {parts.sign && <span className="sc-delta-sign" aria-hidden="true">{parts.sign}</span>}
    <span className="sc-delta-number">{parts.number}</span>
    {parts.suffix && <span className="sc-delta-suffix" aria-hidden="true">{parts.suffix}</span>}
  </>;

  if (!onToggle) return <span className="sc-delta" aria-label={ariaLabel}>{content}</span>;
  return <button type="button" className="sc-delta" aria-expanded={expanded} aria-label={ariaLabel} onClick={onToggle} onBlur={onBlur}>
    <span className="sc-delta-value">{content}</span>
    {alternative && <span className="sc-delta-alternative" data-open={expanded}>{alternative}</span>}
  </button>;
}
