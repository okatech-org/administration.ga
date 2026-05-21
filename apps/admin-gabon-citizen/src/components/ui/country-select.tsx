"use client";

import { CountryCode } from "@convex/lib/constants";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
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
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FlagIcon } from "@/components/ui/flag-icon";

// Define a base interface for common properties
interface BaseCountrySelect {
	options?: CountryCode[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	id?: string;
}

// Extend the base interface for single select
interface SingleSelectCountry extends BaseCountrySelect {
	type: "single";
	selected?: CountryCode;
	onChange: (value: CountryCode) => void;
	disabledOptions?: CountryCode[];
}

// Extend the base interface for multi select
interface MultiSelectCountry extends BaseCountrySelect {
	type: "multiple";
	selected?: CountryCode[];
	onChange: (values: CountryCode[]) => void;
	disabledOptions?: CountryCode[];
}

// Use a discriminated union for the props
type CountrySelectProps = SingleSelectCountry | MultiSelectCountry;

export function CountrySelect(props: CountrySelectProps) {
	const { t, i18n } = useTranslation();

	const {
		type,
		selected,
		onChange: onValueChange,
		options = Object.values(CountryCode),
		placeholder = t("common.country.placeholder"),
		searchPlaceholder = t("common.country.search"),
		emptyText = t("common.country.empty"),
		disabledOptions = [],
		disabled = false,
		id,
	} = props;

	const onChange = (value: CountryCode | CountryCode[]) => {
		if (type === "single") {
			onValueChange(value as CountryCode);
		} else {
			onValueChange(value as CountryCode[]);
		}
	};

	const [open, setOpen] = React.useState(false);

	// Get country name using Intl.DisplayNames for native localization
	const getCountryName = React.useCallback(
		(code: CountryCode) => {
			try {
				const lang = i18n.language || "fr";
				const displayNames = new Intl.DisplayNames([lang], {
					type: "region",
				});
				return displayNames.of(code) ?? code;
			} catch {
				return code;
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[i18n.language],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between"
					disabled={disabled || options.length < 2}
				>
					<div className="flex items-center gap-2">
						{type === "single" && selected && (
							<div className="flex items-center gap-1">
								<FlagIcon countryCode={selected as CountryCode} />
								<span>{getCountryName(selected)}</span>
							</div>
						)}
						{type === "multiple" && selected && selected.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{selected.map((country) => (
									<Badge key={country}>{getCountryName(country)}</Badge>
								))}
							</div>
						)}

						{!selected && (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0">
				<Command>
					<CommandInput
						placeholder={searchPlaceholder}
						className="h-9"
						disabled={disabled}
					/>
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((country: CountryCode) => (
								<CommandItem
									key={country}
									value={getCountryName(country)}
									onSelect={() => {
										if (type === "single") {
											onChange(country);
											setOpen(false);
										} else {
											const currentSelected = (selected as CountryCode[]) || [];
											if (currentSelected.includes(country)) {
												onChange(currentSelected.filter((c) => c !== country));
											} else {
												onChange([...currentSelected, country]);
											}
										}
									}}
									disabled={disabledOptions.includes(country)}
								>
									<div className="flex items-center gap-2">
										<FlagIcon countryCode={country} />
										<span>{getCountryName(country)}</span>
									</div>
									<CheckIcon
										className={cn(
											"ml-auto h-4 w-4",
											type === "single"
												? selected === country
													? "opacity-100"
													: "opacity-0"
												: (selected as CountryCode[])?.includes(country)
													? "opacity-100"
													: "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
