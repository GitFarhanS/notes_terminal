import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function CustomTerminal({ prompt, onInput, children, getCompletions }) {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [children]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue;
      if (value.trim()) {
        setHistory((prev) => [...prev, value]);
      }
      setHistoryIndex(-1);
      setSavedInput('');
      setInputValue('');
      onInput(value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === -1) {
        setSavedInput(inputValue);
        const newIdx = history.length - 1;
        setHistoryIndex(newIdx);
        setInputValue(history[newIdx]);
      } else if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setInputValue(history[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex < history.length - 1) {
        const newIdx = historyIndex + 1;
        setHistoryIndex(newIdx);
        setInputValue(history[newIdx]);
      } else {
        setHistoryIndex(-1);
        setInputValue(savedInput);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!getCompletions) return;

      const completions = getCompletions(inputValue);
      if (completions.length === 1) {
        setInputValue(completions[0]);
      } else if (completions.length > 1) {
        const common = longestCommonPrefix(completions);
        if (common.length > inputValue.length) {
          setInputValue(common);
        } else {
          onInput(inputValue, true);
        }
      }
    }
  };

  return (
    <div className="custom-terminal-wrapper" onClick={focusInput}>
      <div className="custom-terminal-header">
        <div className="custom-terminal-buttons">
          <span className="btn-red" />
          <span className="btn-yellow" />
          <span className="btn-green" />
        </div>
        <span className="custom-terminal-title">Notes Terminal</span>
      </div>
      <div className="custom-terminal-body">
        <div className="custom-terminal-output">
          {children}
        </div>
        <div className="custom-terminal-input-line">
          <span className="custom-terminal-prompt">{prompt}</span>
          <input
            ref={inputRef}
            type="text"
            className="custom-terminal-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setHistoryIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        <div ref={scrollRef} />
      </div>
    </div>
  );
}

function longestCommonPrefix(strings) {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}
