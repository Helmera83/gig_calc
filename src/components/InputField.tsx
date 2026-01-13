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
    <div className="group relative flex flex-col gap-1.5">
      <label 
          htmlFor={id} 
          className="text-[11px] font-bold uppercase tracking-wider text-on-surface-60 ml-1"
      >
          {label}
      </label>
      <div className="
  flex items-center
  bg-surface-container-highest-30
  rounded-2xl
  border border-outline-variant-20
  group-focus-within:border-primary
  group-focus-within:bg-surface-container-highest
  transition-all duration-300
  h-14 px-4
">
        <div className="text-on-surface-70 mr-3 group-focus-within:text-primary transition-colors">
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
            className="flex-grow bg-transparent text-on-surface placeholder-on-surface-30 focus:outline-none text-base h-full"
            min={min}
            step={step}
        />
        
        <div className="ml-2 pl-3 border-l border-outline-variant-20">
          <span className="text-xs text-on-surface-70 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
};
