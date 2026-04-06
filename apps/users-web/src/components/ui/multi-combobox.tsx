"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "@/components/ui/combobox";

interface MultiComboboxProps<T extends string = string> {
	options: ComboboxOption<T>[];
	value?: T[];
	onValueChange?: (value: T[]) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
}

export function MultiCombobox<T extends string = string>({
	options,
	value = [],
	onValueChange,
	placeholder = "Sélectionner...",
	searchPlaceholder = "Rechercher...",
	emptyText = "Aucun résultat.",
	className,
	disabled = false,
}: MultiComboboxProps<T>) {
	const [open, setOpen] = React.useState(false);

	const selectedOptions = options.filter((option) =>
		value.includes(option.value),
	);

	const handleUnselect = (optionValue: T) => {
		if (onValueChange) {
			onValueChange(value.filter((v) => v !== optionValue));
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
						"w-full justify-between h-auto min-h-10 hover:bg-background",
						className,
					)}
					disabled={disabled}
				>
					<div className="flex flex-wrap gap-1 py-1">
						{selectedOptions.length > 0 ? (
							selectedOptions.map((option) => (
								<Badge
									key={option.value}
									variant="secondary"
									className="mr-1 mb-0.5"
									onClick={(e) => {
										e.stopPropagation();
										handleUnselect(option.value);
									}}
								>
									{option.icon && <span className="mr-1">{option.icon}</span>}
									{option.label}
									<button
										type="button"
										className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleUnselect(option.value);
											}
										}}
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											handleUnselect(option.value);
										}}
									>
										<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
									</button>
								</Badge>
							))
						) : (
							<span className="text-muted-foreground font-normal ml-1">
								{placeholder}
							</span>
						)}
					</div>
					<ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = value.includes(option.value);
								return (
									<CommandItem
										key={option.value}
										value={option.label}
										onSelect={() => {
											if (onValueChange) {
												if (isSelected) {
													onValueChange(
														value.filter((v) => v !== option.value),
													);
												} else {
													onValueChange([...value, option.value]);
												}
											}
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												isSelected ? "opacity-100" : "opacity-0",
											)}
										/>
										{option.icon && <span className="mr-2">{option.icon}</span>}
										{option.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default MultiCombobox;
