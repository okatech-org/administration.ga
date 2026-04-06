import type { CVThemeProps } from "../types";

export function CVThemeClassic({ data }: CVThemeProps) {
  return (
    <div
      className="w-full min-h-[1123px] bg-white text-gray-800 p-10"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold tracking-wide uppercase">
          {data.firstName} {data.lastName}
        </h1>
        {data.title && (
          <p className="text-gray-600 mt-1 text-lg italic">{data.title}</p>
        )}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-3 flex-wrap">
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>• {data.phone}</span>}
          {data.address && <span>• {data.address}</span>}
        </div>
      </div>

      {/* Objective */}
      {data.objective && (
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">
            Objectif
          </h2>
          <p className="text-sm text-gray-600 italic leading-relaxed">
            {data.objective}
          </p>
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">
            Profil Professionnel
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed text-justify">
            {data.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {data.experiences.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-3">
            Expérience Professionnelle
          </h2>
          <div className="space-y-4">
            {data.experiences.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-sm">{exp.title}</h3>
                  <span className="text-xs text-gray-500">
                    {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">
                  {exp.company}
                  {exp.location && `, ${exp.location}`}
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
        <div className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-3">
            Formation
          </h2>
          <div className="space-y-3">
            {data.education.map((edu, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-sm">{edu.degree}</h3>
                  <span className="text-xs text-gray-500">
                    {edu.startDate} — {edu.endDate || "?"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">
                  {edu.school}
                  {edu.location && `, ${edu.location}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills & Languages side by side */}
      <div className="grid grid-cols-2 gap-6">
        {data.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">
              Compétences
            </h2>
            <ul className="space-y-1">
              {data.skills.map((s, i) => (
                <li key={i} className="text-xs flex justify-between">
                  <span>{s.name}</span>
                  <span className="text-gray-400">{s.level}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300 pb-1 mb-2">
              Langues
            </h2>
            <ul className="space-y-1">
              {data.languages.map((l, i) => (
                <li key={i} className="text-xs flex justify-between">
                  <span>{l.name}</span>
                  <span className="text-gray-400">{l.level}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
