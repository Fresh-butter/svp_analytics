import React from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <div className={twMerge(clsx("bg-surface border border-surfaceHighlight rounded-xl overflow-hidden shadow-sm", className))}>
      {children}
    </div>
  );
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  panelClassName,
  bodyClassName,
}: {
  isOpen: boolean,
  onClose: () => void,
  title: string,
  children: React.ReactNode,
  panelClassName?: string,
  bodyClassName?: string,
}) => {
  if (!isOpen) return null;
  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={twMerge(clsx("bg-surface border border-surfaceHighlight rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar", panelClassName))}>
        <div className="flex items-center justify-between p-6 border-b border-surfaceHighlight">
          <h3 className="text-xl font-bold text-text">{title}</h3>
          <button onClick={onClose} className="text-textMuted hover:text-text transition-colors">
            ✕
          </button>
        </div>
        <div className={twMerge(clsx("p-6", bodyClassName))}>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  type = 'button',
  className,
  disabled = false
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost', 
  onClick?: () => void, 
  type?: 'button' | 'submit' | 'reset',
  className?: string,
  disabled?: boolean
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryHover shadow-lg shadow-primary/25",
    secondary: "bg-surface text-text border border-surfaceHighlight hover:bg-surfaceHighlight",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    ghost: "text-textMuted hover:text-text hover:bg-surfaceHighlight/50"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={twMerge(clsx(baseStyles, variants[variant], disabled && "opacity-50 cursor-not-allowed", className))}
    >
      {children}
    </button>
  );
};

export const Input = ({ 
    label, 
    type = 'text', 
    value, 
    onChange, 
    placeholder, 
    required = false 
}: { 
    label: string, 
    type?: string, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    placeholder?: string, 
    required?: boolean 
}) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-textMuted">{label} {required && <span className="text-red-400">*</span>}</label>
        <input 
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
    </div>
);

export const Select = ({ 
    label, 
    value, 
    onChange, 
    required = false, 
    helperText,
    disabled = false,
    children,
    className
}: { 
    label?: string, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, 
    required?: boolean, 
    helperText?: string,
    disabled?: boolean,
    children: React.ReactNode,
    className?: string
}) => (
    <div className="space-y-1.5">
        {label && <label className="text-sm font-medium text-textMuted">{label} {required && <span className="text-red-400">*</span>}</label>}
        <div className="relative">
            <select 
                value={value} 
                onChange={onChange} 
                required={required} 
                disabled={disabled}
                className={twMerge(clsx("ui-select", className))}
            >
                {children}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
        </div>
        {helperText && <p className="text-xs text-textMuted">{helperText}</p>}
    </div>
);
