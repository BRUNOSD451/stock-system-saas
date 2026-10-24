import "./filterBar.css";

export interface FilterOption { value: string; label: string; }

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  // Valor que significa "sem filtro"; diferente dele, o controle aparece como ativo.
  defaultValue?: string;
  disabled?: boolean;
}

// Select da barra de ferramentas com o rótulo visível dentro do controle ("Categoria: Todas").
export default function FilterSelect({ label, value, options, onChange, defaultValue, disabled = false }: FilterSelectProps) {
  const isActive = defaultValue !== undefined && value !== defaultValue;
  return (
    <label className={`filter-select${isActive ? " is-active" : ""}`}>
      <span className="filter-select-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
