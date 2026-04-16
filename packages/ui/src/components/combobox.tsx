"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@workspace/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

export interface ComboboxOption<T extends string = string> {
	value: T;
	label: string;
	icon?: React.ReactNode;
}

interface ComboboxProps<T extends string = string> {
	options: ComboboxOption<T>[];
	value?: T | null;
	onValueChange?: (value: T) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}

export function Combobox<T extends string = string>({
	options,
	value,
	onValueChange,
	placeholder = "Sélectionner...",
	searchPlaceholder = "Rechercher...",
	emptyText = "Aucun résultat.",
	className,
	disabled = false,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
}: ComboboxProps<T>) {
	const [open, setOpen] = React.useState(false);

	const selectedOption = options.find((option) => option.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					className={cn("w-full justify-between font-normal", className)}
					disabled={disabled}
				>
					{selectedOption ? (
						<span className="flex items-center gap-2 truncate">
							{selectedOption.icon}
							{selectedOption.label}
						</span>
					) : (
						<span className="text-muted-foreground">{placeholder}</span>
					)}
					<ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] gap-0 border border-border p-0 shadow-lg"
				align="start"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									data-checked={value === option.value ? "true" : undefined}
									onSelect={() => {
										if (onValueChange) {
											onValueChange(option.value);
										}
										setOpen(false);
									}}
								>
									{option.icon && <span className="mr-2">{option.icon}</span>}
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default Combobox;
