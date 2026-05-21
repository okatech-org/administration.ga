"use client";

import { CountryCode } from "@convex/lib/constants";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export interface Address {
	street: string;
	city: string;
	postalCode: string;
	country: CountryCode;
}

interface AddressFieldProps {
	/** Unique identifier for the field */
	fieldId: string;
	/** Label for the address section */
	label?: string;
	/** Current address value */
	address?: Address;
	/** Callback when address changes */
	onChange: (address: Address) => void;
	/** Whether the field is disabled */
	disabled?: boolean;
	/** Optional list of countries to show */
	countries?: CountryCode[];
	/** Optional class name for the container */
	className?: string;
	/** Error messages for individual fields */
	errors?: {
		street?: string;
		city?: string;
		postalCode?: string;
		country?: string;
	};
}

export function AddressField({
	fieldId,
	label,
	address,
	onChange,
	disabled,
	countries,
	className,
	errors,
}: AddressFieldProps) {
	const { t } = useTranslation();

	const handleChange = (field: keyof Address, value: string | CountryCode) => {
		onChange({
			street: address?.street ?? "",
			city: address?.city ?? "",
			postalCode: address?.postalCode ?? "",
			country: address?.country ?? CountryCode.FR,
			[field]: value,
		});
	};

	return (
		<FieldSet className={cn("col-span-full grid grid-cols-2 gap-4", className)}>
			{label && <FieldLegend variant="label">{label}</FieldLegend>}

			{/* Street Address */}
			<Field className="col-span-full" data-invalid={!!errors?.street}>
				<FieldLabel htmlFor={`${fieldId}-street`}>
					{t("inputs.address.street.label")}
				</FieldLabel>
				<Input
					id={`${fieldId}-street`}
					value={address?.street ?? ""}
					onChange={(e) => handleChange("street", e.target.value)}
					placeholder={t(
						"inputs.address.street.placeholder",
						"Numéro et nom de rue",
					)}
					disabled={disabled}
					aria-invalid={!!errors?.street}
					autoComplete="street-address"
				/>
				{errors?.street && <FieldError errors={[{ message: errors.street }]} />}
			</Field>

			{/* City and Postal Code */}
			<div className="col-span-full grid grid-cols-3 gap-2">
				<Field className="col-span-2" data-invalid={!!errors?.city}>
					<FieldLabel htmlFor={`${fieldId}-city`}>
						{t("inputs.address.city.label")}
					</FieldLabel>
					<Input
						id={`${fieldId}-city`}
						value={address?.city ?? ""}
						onChange={(e) => handleChange("city", e.target.value)}
						placeholder={t("inputs.address.city.placeholder")}
						disabled={disabled}
						aria-invalid={!!errors?.city}
						autoComplete="address-level2"
					/>
					{errors?.city && <FieldError errors={[{ message: errors.city }]} />}
				</Field>

				<Field data-invalid={!!errors?.postalCode}>
					<FieldLabel htmlFor={`${fieldId}-postalCode`}>
						{t("inputs.address.postalCode.label")}
					</FieldLabel>
					<Input
						id={`${fieldId}-postalCode`}
						value={address?.postalCode ?? ""}
						onChange={(e) => handleChange("postalCode", e.target.value)}
						placeholder={t("inputs.address.postalCode.placeholder")}
						disabled={disabled}
						aria-invalid={!!errors?.postalCode}
						autoComplete="postal-code"
					/>
					{errors?.postalCode && (
						<FieldError errors={[{ message: errors.postalCode }]} />
					)}
				</Field>
			</div>

			{/* Country */}
			<Field className="col-span-full" data-invalid={!!errors?.country}>
				<FieldLabel htmlFor={`${fieldId}-country`}>
					{t("inputs.address.country.label")}
				</FieldLabel>
				<CountrySelect
					id={`${fieldId}-country`}
					type="single"
					selected={address?.country}
					onChange={(value) => handleChange("country", value)}
					{...(countries && { options: countries })}
					disabled={disabled}
				/>
				{errors?.country && (
					<FieldError errors={[{ message: errors.country }]} />
				)}
			</Field>
		</FieldSet>
	);
}
