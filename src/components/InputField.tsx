import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  unit: string;
  icon: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string;
  min?: string;
  step?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, placeholder, unit, icon, inputRef, type = 'number', min = '0', step = '0.01' }) => {
  return (
    <div className="input-field-group">
      <label
          htmlFor={id} 
          className="input-field-label"
      >
          {label}
      </label>
      <div className="input-field-container">
        <div className="input-field-icon">
            {icon}
        </div>
        
        <input
            type={type}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            ref={inputRef}
            className="input-field-input"
            min={min}
            step={step}
        />
        
        <div className="input-field-unit">
          <span className="input-field-unit-text">{unit}</span>
        </div>
      </div>
    </div>
  );
};
