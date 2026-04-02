import type { CVThemeProps } from "../types";

export function CVThemeProfessional({ data }: CVThemeProps) {
  return (
    <div
      className="w-full min-h-[1123px] bg-white text-gray-800"
      style={{ fontFamily: "'Roboto', sans-serif" }}
    >
      {/* Header with teal accent */}
      <div className="bg-teal-700 text-white px-10 py-6">
        <h1 className="text-2xl font-bold">
          {data.firstName} {data.lastName}
        </h1>
        {data.title && (
          <p className="text-teal-100 text-sm mt-1">{data.title}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-teal-200 mt-3 flex-wrap">
          {data.email && <span> {data.email}</span>}
          {data.phone && <span> {data.phone}</span>}
          {data.address && <span> {data.address}</span>}
          {data.linkedinUrl && <span> LinkedIn</span>}
        </div>
      </div>

      <div className="px-10 py-6 space-y-5">
        {/* Summary */}
        {data.summary && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-teal-700" />
              Profil Professionnel
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {data.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {data.experiences.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-teal-700" />
              Expérience
            </h2>
            <div className="space-y-4">
              {data.experiences.map((exp, i) => (
                <div key={i} className="pl-4 border-l-2 border-teal-200">
                  <h3 className="font-bold text-sm">{exp.title}</h3>
                  <p className="text-xs text-teal-700 font-medium">
                    {exp.company}
                    {exp.location && ` — ${exp.location}`}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
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
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-teal-700" />
              Formation
            </h2>
            <div className="space-y-2">
              {data.education.map((edu, i) => (
                <div key={i} className="pl-4 border-l-2 border-teal-200">
                  <h3 className="font-bold text-sm">{edu.degree}</h3>
                  <p className="text-xs text-gray-500">{edu.school}</p>
                  <p className="text-[11px] text-gray-400">
                    {edu.startDate} — {edu.endDate || "?"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-teal-700" />
              Compétences
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded text-[11px] font-medium border border-teal-100"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {data.languages.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-teal-700" />
              Langues
            </h2>
            <div className="flex gap-4">
              {data.languages.map((l, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-gray-400 ml-1">({l.level})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
