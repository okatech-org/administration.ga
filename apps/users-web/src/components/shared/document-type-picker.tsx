"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
import type { DetailedDocumentType } from "@/lib/document-types";
import {
	getGroupedDocumentTypes,
	getTypeTranslationKey,
} from "@/lib/document-types";
import { cn } from "@/lib/utils";

interface DocumentTypePickerProps {
	/** Selected document type values */
	value?: DetailedDocumentType[];
	/** Callback when selection changes */
	onValueChange?: (value: DetailedDocumentType[]) => void;
	/** Placeholder text when no selection */
	placeholder?: string;
	/** Search placeholder */
	searchPlaceholder?: string;
	/** Empty state text */
	emptyText?: string;
	/** Additional class names */
	className?: string;
	/** Whether the picker is disabled */
	disabled?: boolean;
	/** Whether to allow multiple selection */
	multiple?: boolean;
}

/**
 * DocumentTypePicker - ComboBox for selecting document types
 *
 * Features:
 * - Groups document types by category
 * - Supports single and multi-select modes
 * - Uses i18n translation keys for labels
 * - Searchable with filtering
 */
export function DocumentTypePicker({
	value = [],
	onValueChange,
	placeholder,
	searchPlaceholder,
	emptyText,
	className,
	disabled = false,
	multiple = true,
}: DocumentTypePickerProps) {
	const { t } = useTranslation();
	const [open, setOpen] = React.useState(false);

	// Get grouped document types for rendering
	const groupedTypes = React.useMemo(() => getGroupedDocumentTypes(), []);

	// Get labels for selected values
	const getTypeLabel = (type: DetailedDocumentType): string => {
		return t(getTypeTranslationKey(type), type);
	};

	const getCategoryLabel = (categoryKey: string): string => {
		return t(categoryKey, categoryKey.split(".").pop() || categoryKey);
	};

	const handleSelect = (type: DetailedDocumentType) => {
		if (!onValueChange) return;

		if (multiple) {
			if (value.includes(type)) {
				onValueChange(value.filter((v) => v !== type));
			} else {
				onValueChange([...value, type]);
			}
		} else {
			onValueChange([type]);
			setOpen(false);
		}
	};

	const handleUnselect = (type: DetailedDocumentType) => {
		if (onValueChange) {
			onValueChange(value.filter((v) => v !== type));
		}
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onValueChange) {
			onValueChange([]);
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
					<div className="flex flex-wrap gap-1 py-1 flex-1">
						{value.length > 0 ? (
							multiple ? (
								value.map((type) => (
									<Badge key={type} variant="secondary" className="mr-1 mb-0.5">
										{getTypeLabel(type)}
										<button
											type="button"
											className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													handleUnselect(type);
												}
											}}
											onMouseDown={(e) => {
												e.preventDefault();
												e.stopPropagation();
											}}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleUnselect(type);
											}}
										>
											<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
										</button>
									</Badge>
								))
							) : (
								<span className="truncate">{getTypeLabel(value[0])}</span>
							)
						) : (
							<span className="text-muted-foreground font-normal">
								{placeholder ||
									t(
										"documentTypes.picker.placeholder",
										"Sélectionner un type...",
									)}
							</span>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						{value.length > 0 && (
							<button
								type="button"
								className="p-1 hover:bg-muted rounded"
								onClick={handleClear}
							>
								<X className="h-4 w-4 text-muted-foreground" />
							</button>
						)}
						<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0 max-h-[400px]"
				align="start"
			>
				<Command>
					<CommandInput
						placeholder={
							searchPlaceholder ||
							t("documentTypes.picker.search")
						}
					/>
					<CommandList className="max-h-[350px]">
						<CommandEmpty>
							{emptyText ||
								t("documentTypes.picker.empty")}
						</CommandEmpty>
						{groupedTypes.map((group, index) => (
							<React.Fragment key={group.category}>
								{index > 0 && <CommandSeparator />}
								<CommandGroup
									heading={getCategoryLabel(group.categoryLabelKey)}
								>
									{group.types.map((type) => {
										const isSelected = value.includes(type.value);
										return (
											<CommandItem
												key={type.value}
												value={`${group.category}-${type.value}`}
												onSelect={() => handleSelect(type.value)}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														isSelected ? "opacity-100" : "opacity-0",
													)}
												/>
												{t(type.labelKey, type.value)}
											</CommandItem>
										);
									})}
								</CommandGroup>
							</React.Fragment>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default DocumentTypePicker;
