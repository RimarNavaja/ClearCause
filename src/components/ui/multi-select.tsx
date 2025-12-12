"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onSelectedChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplay?: number; // Maximum number of badges to display
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onSelectedChange,
  placeholder = "Select items...",
  className,
  maxDisplay = 3,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onSelectedChange(selected.filter((item) => item !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between hover:[&>span]:text-white",
            className
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {selected.slice(0, maxDisplay).map((value) => {
                const option = options.find((opt) => opt.value === value);
                return (
                  <Badge
                    key={value}
                    className="flex items-center gap-1 bg-blue-700 text-white hover:bg-blue-600 px-2"
                  >
                    {option?.label}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleSelect(value);
                        }
                      }}
                      className="ml-1 flex h-3 w-3 cursor-pointer items-center justify-center rounded-full text-primary-foreground hover:bg-blue-700"
                    >
                      <Check className="h-2 w-2" />
                    </div>
                  </Badge>
                );
              })}
              {selected.length > maxDisplay && (
                <Badge variant="secondary">
                  +{selected.length - maxDisplay} more
                </Badge>
              )}
            </div>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search items..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-48">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="mb-1 font-poppinsregular  text-black data-[selected=true]:bg-blue-600 data-[selected=true]:text-white hover:bg-blue-600 hover:text-white"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onSelectedChange([])} >
                    Clear all
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
