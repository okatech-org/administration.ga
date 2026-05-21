import type { CVThemeProps } from "../types";

export function CVThemeMinimalist({ data }: CVThemeProps) {
  return (
    <div
      className="w-full min-h-[1123px] bg-white text-gray-900 px-12 py-10"
      style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
    >
      {/* Header - Ultra clean */}
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-[0.2em] uppercase">
          {data.firstName}{" "}
          <span className="font-semibold">{data.lastName}</span>
        </h1>
        {data.title && (
          <p className="text-sm text-gray-400 mt-1 tracking-wider uppercase">
            {data.title}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-3">
          {data.email && <span>{data.email}</span>}
          {data.phone && (
            <>
              <span className="text-gray-200">|</span>
              <span>{data.phone}</span>
            </>
          )}
          {data.address && (
            <>
              <span className="text-gray-200">|</span>
              <span>{data.address}</span>
            </>
          )}
        </div>
        <div className="w-12 h-px bg-gray-900 mt-4" />
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mb-8">
          <p className="text-sm text-gray-600 leading-relaxed max-w-[520px]">
            {data.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {data.experiences.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-4">
            Expérience
          </h2>
          <div className="space-y-5">
            {data.experiences.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold">{exp.title}</h3>
                  <span className="text-[11px] text-gray-400">
                    {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{exp.company}</p>
                {exp.description && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-4">
            Formation
          </h2>
          <div className="space-y-3">
            {data.education.map((edu, i) => (
              <div key={i} className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-sm font-semibold">{edu.degree}</h3>
                  <p className="text-xs text-gray-500">{edu.school}</p>
                </div>
                <span className="text-[11px] text-gray-400">
                  {edu.startDate} — {edu.endDate || "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills - Inline */}
      {data.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-3">
            Compétences
          </h2>
          <p className="text-xs text-gray-600">
            {data.skills.map((s) => s.name).join(" · ")}
          </p>
        </div>
      )}

      {/* Languages - Inline */}
      {data.languages.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-3">
            Langues
          </h2>
          <p className="text-xs text-gray-600">
            {data.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
