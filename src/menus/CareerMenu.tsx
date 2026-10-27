import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Plus, Trash2, Trophy, DollarSign } from 'lucide-react'
import { useCareerStore } from '../store/careerStore'
import { useTeamStore } from '../store/teamStore'
import { TEAMS } from '../data/teams'

export default function CareerMenu() {
  const navigate = useNavigate()
  const { saves, activeSaveId, createSave, loadSave, deleteSave, getActiveSave } = useCareerStore()
  const { setHomeTeam } = useTeamStore()

  const [managerName, setManagerName] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState(TEAMS[0].id)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const activeSave = getActiveSave()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerName.trim()) return
    const id = createSave(managerName.trim(), selectedTeamId)
    loadSave(id)
    setHomeTeam(selectedTeamId)
    setShowCreateModal(false)
  }

  const handlePlayFixture = () => {
    if (activeSave) {
      setHomeTeam(activeSave.teamId)
      navigate('/match')
    }
  }

  const getTeamName = (id: string) => TEAMS.find((t) => t.id === id)?.name || id

  return (
    <div className="relative w-screen h-screen bg-ui-dark text-white font-display overflow-hidden flex flex-col justify-between p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-wide">Manager Career Mode</h1>
            <p className="text-xs text-white/50">Manage your club, win silverware & sign talent</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Career Save</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-4 flex-1 overflow-hidden">
        {/* Left Column: Career Saves List */}
        <div className="bg-ui-card/90 border border-white/10 rounded-2xl p-5 shadow-2xl overflow-y-auto flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ui-accent mb-1">
            Career Saves ({saves.length})
          </h2>

          {saves.length === 0 ? (
            <div className="my-auto text-center p-6 text-white/40 text-xs">
              No career saves found. Click "New Career Save" to begin your managerial journey.
            </div>
          ) : (
            saves.map((save) => {
              const isCurrent = save.id === activeSaveId
              return (
                <div
                  key={save.id}
                  onClick={() => {
                    loadSave(save.id)
                    setHomeTeam(save.teamId)
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'border-ui-accent bg-ui-accent/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-sm">{save.managerName}</div>
                    <div className="text-xs text-ui-accent font-semibold">{getTeamName(save.teamId)}</div>
                    <div className="text-[10px] text-white/50 mt-1">
                      Season {save.currentSeason.year} • Pos: #{save.currentSeason.leaguePosition}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSave(save.id)
                    }}
                    className="p-2 text-white/40 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Center & Right Column: Active Career Dashboard */}
        <div className="lg:col-span-2 bg-ui-card/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {activeSave ? (
            <div className="flex flex-col gap-6">
              {/* Dashboard Banner */}
              <div className="flex items-start justify-between border-b border-white/10 pb-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ui-accent">
                    Active Manager Profile
                  </span>
                  <h2 className="text-3xl font-black italic">{activeSave.managerName}</h2>
                  <div className="text-sm font-bold text-white/70 mt-1">
                    Club: <strong className="text-white">{getTeamName(activeSave.teamId)}</strong>
                  </div>
                </div>

                <button
                  onClick={handlePlayFixture}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Play Next Fixture</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white/60 mb-1">
                    <Trophy className="w-4 h-4 text-ui-gold" />
                    <span>League Standing</span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    #{activeSave.currentSeason.leaguePosition}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">
                    W: {activeSave.currentSeason.wins} • D: {activeSave.currentSeason.draws} • L: {activeSave.currentSeason.losses}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white/60 mb-1">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Transfer Budget</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    ${(activeSave.budget / 1_000_000).toFixed(1)}M
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">Wage cap: $1.2M/wk</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs font-bold text-white/60 mb-1">Manager Rating</div>
                  <div className="text-2xl font-black text-ui-accent font-mono">
                    {activeSave.reputation} / 100
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">Board Confidence: High</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto text-center p-12 text-white/40">
              Select or create a career save on the left to view your manager dashboard.
            </div>
          )}

          <div className="border-t border-white/10 pt-3 text-xs text-white/40">
            Career mode saves persist directly in browser storage and support multi-season progression.
          </div>
        </div>
      </div>

      {/* Modal: Create Career Save */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in">
          <form
            onSubmit={handleCreate}
            className="bg-ui-dark border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4"
          >
            <h2 className="text-lg font-black tracking-wide">Create New Career</h2>

            <div>
              <label className="text-xs font-bold text-white/70 block mb-1">Manager Name</label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="e.g. Pep Guardiola"
                className="w-full bg-ui-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-ui-accent"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/70 block mb-1">Choose Club</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-ui-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-ui-accent"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-ui-dark">
                    {t.name} ({t.league})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-ui-accent hover:bg-ui-accent/80 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Start Career
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/10 pt-3 text-xs text-white/50 text-center">
        Lead your club through domestic leagues and European glory.
      </div>
    </div>
  )
}
