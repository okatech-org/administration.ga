import type { CVThemeProps } from "../types";

export function CVThemeCreative({ data }: CVThemeProps) {
  return (
    <div
      className="w-full min-h-[1123px] bg-gradient-to-br from-rose-50 to-violet-50 text-gray-800"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Header */}
      <div className="px-10 pt-8 pb-6">
        <div className="flex items-end gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {(data.firstName || "?")[0]}
            {(data.lastName || "?")[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-violet-600 bg-clip-text text-transparent">
              {data.firstName} {data.lastName}
            </h1>
            {data.title && (
              <p className="text-violet-500 font-medium text-sm">
                {data.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-4 flex-wrap">
          {data.email && (
            <span className="bg-white/60 px-2.5 py-1 rounded-full">
              {data.email}
            </span>
          )}
          {data.phone && (
            <span className="bg-white/60 px-2.5 py-1 rounded-full">
              {data.phone}
            </span>
          )}
          {data.address && (
            <span className="bg-white/60 px-2.5 py-1 rounded-full">
              {data.address}
            </span>
          )}
        </div>
      </div>

      <div className="px-10 pb-8 space-y-5">
        {/* Summary */}
        {data.summary && (
          <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
            <p className="text-sm text-gray-600 leading-relaxed">
              {data.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {data.experiences.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-3">
               Expérience
            </h2>
            <div className="space-y-3">
              {data.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">
                        {exp.title}
                      </h3>
                      <p className="text-xs text-violet-500 font-medium">
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-3">
               Formation
            </h2>
            <div className="space-y-2">
              {data.education.map((edu, i) => (
                <div
                  key={i}
                  className="bg-white/70 backdrop-blur rounded-xl p-3 border border-white/50 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-sm">{edu.degree}</h3>
                    <p className="text-xs text-gray-500">{edu.school}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {edu.startDate} — {edu.endDate || "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-2">
               Compétences
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gradient-to-r from-rose-100 to-violet-100 text-gray-700 rounded-full text-[11px] font-medium border border-rose-200/50"
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-2">
               Langues
            </h2>
            <div className="flex gap-2">
              {data.languages.map((l, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-white/70 rounded-full text-xs border border-white/50"
                >
                  {l.name} <span className="text-gray-400">({l.level})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
