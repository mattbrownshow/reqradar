import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X, Check } from "lucide-react";

export default function SearchableMultiSelect({ 
  items, 
  selected, 
  onSelect, 
  onRemove, 
  placeholder,
  groupedBy = null 
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filterItems = () => {
    if (!query || query.length < 2) return groupedBy || items;
    
    const lowerQuery = query.toLowerCase();
    
    if (groupedBy) {
      const filtered = {};
      Object.keys(groupedBy).forEach(group => {
        const matches = groupedBy[group].filter(item => 
          item.toLowerCase().includes(lowerQuery)
        );
        if (matches.length > 0) filtered[group] = matches;
      });
      return filtered;
    }
    
    return items.filter(item => item.toLowerCase().includes(lowerQuery));
  };

  const handleSelect = (item) => {
    if (!selected.includes(item)) {
      onSelect(item);
      setQuery("");
    }
  };

  const filteredItems = filterItems();

  return (
    <div ref={containerRef} className="space-y-3">
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className="rounded-xl"
      />

      {/* Dropdown */}
      {showDropdown && query.length >= 2 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {groupedBy ? (
            Object.keys(filteredItems).length > 0 ? (
              Object.keys(filteredItems).map(group => (
                <div key={group}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                    {group}
                  </div>
                  {filteredItems[group].map(item => {
                    const isSelected = selected.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          isSelected ? "text-[#F7931E] font-medium" : "text-gray-700"
                        }`}
                      >
                        {item}
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div>
                <div className="px-3 py-3 text-sm text-gray-500 text-center border-b border-gray-100">
                  No matches found
                </div>
                <button
                  onClick={() => {
                    handleSelect(query.trim());
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-3 text-sm text-[#F7931E] hover:bg-[#FFF5E6] flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-lg">+</span>
                  Add "<strong>{query.trim()}</strong>" as custom option
                </button>
              </div>
            )
          ) : (
            filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const isSelected = selected.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? "text-[#F7931E] font-medium" : "text-gray-700"
                    }`}
                  >
                    {item}
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })
            ) : (
              <div>
                <div className="px-3 py-3 text-sm text-gray-500 text-center border-b border-gray-100">
                  No matches found
                </div>
                <button
                  onClick={() => {
                    handleSelect(query.trim());
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-3 text-sm text-[#F7931E] hover:bg-[#FFF5E6] flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-lg">+</span>
                  Add "<strong>{query.trim()}</strong>" as custom option
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Selected Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(item => (
            <div
              key={item}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-[#F7931E] hover:bg-[#FEF3E2] transition-colors"
            >
              {item}
              <button
                onClick={() => onRemove(item)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}