import { Mail, Phone, MapPin, Link2 } from "lucide-react";
import type { CVThemeProps } from "../types";

export function CVThemeModern({ data }: CVThemeProps) {
  const initials = `${(data.firstName || "?")[0]}${(data.lastName || "?")[0]}`;

  return (
    <div
      className="w-full h-full bg-white text-slate-800 p-0 flex min-h-[1123px]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Sidebar */}
      <div className="w-1/3 bg-slate-900 text-white p-8 flex flex-col gap-7">
        <div className="text-center">
          <div className="w-28 h-28 mx-auto bg-slate-700 rounded-full mb-4 flex items-center justify-center text-2xl font-bold border-4 border-slate-600">
            {initials}
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider leading-tight">
            {data.firstName}
            <br />
            {data.lastName}
          </h1>
          {data.title && (
            <p className="text-slate-400 mt-2 font-medium text-sm">
              {data.title}
            </p>
          )}
        </div>

        <div className="space-y-3 text-sm">
          {data.email && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Mail size={13} />
              </div>
              <span className="truncate">{data.email}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Phone size={13} />
              </div>
              <span>{data.phone}</span>
            </div>
          )}
          {data.address && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <MapPin size={13} />
              </div>
              <span>{data.address}</span>
            </div>
          )}
          {data.linkedinUrl && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Link2 size={13} />
              </div>
              <span className="truncate text-xs">{data.linkedinUrl}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {data.skills.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase border-b border-slate-700 pb-2 mb-3">
              Compétences
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-800 rounded-full text-[11px] font-medium"
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
            <h3 className="text-sm font-bold uppercase border-b border-slate-700 pb-2 mb-3">
              Langues
            </h3>
            <div className="space-y-1.5">
              {data.languages.map((l, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{l.name}</span>
                  <span className="text-slate-400 text-xs">{l.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hobbies */}
        {data.hobbies && data.hobbies.length > 0 && (
          <div>
            <h3 className="text-sm font-bold uppercase border-b border-slate-700 pb-2 mb-3">
              Centres d'intérêt
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.hobbies.map((h, i) => (
                <span key={i} className="text-xs text-slate-300">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="w-2/3 p-8 bg-white">
        {/* Summary */}
        {data.summary && (
          <div className="mb-7">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-3">
              Profil
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm text-justify">
              {data.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {data.experiences.length > 0 && (
          <div className="mb-7">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-4">
              Expérience
            </h2>
            <div className="space-y-5">
              {data.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="relative pl-5 border-l-2 border-slate-200"
                >
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    {exp.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {exp.company}
                    {exp.location && ` • ${exp.location}`}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mb-1">
                    {exp.startDate} — {exp.current ? "Présent" : exp.endDate}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">
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
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-4">
              Formation
            </h2>
            <div className="space-y-3">
              {data.education.map((edu, i) => (
                <div key={i}>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {edu.degree}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {edu.school}
                    {edu.location && `, ${edu.location}`}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {edu.startDate} — {edu.endDate || "?"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
