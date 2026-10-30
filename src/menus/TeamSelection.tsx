import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Search, ArrowRightLeft } from 'lucide-react'
import { TEAMS } from '../data/teams'
import { useTeamStore } from '../store/teamStore'

export default function TeamSelection() {
  const navigate = useNavigate()
  const { homeTeamId, awayTeamId, setHomeTeam, setAwayTeam, swap } = useTeamStore()

  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')

  const leagues = ['all', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']

  const filteredTeams = TEAMS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.shortName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLeague = leagueFilter === 'all' || t.league === leagueFilter
    return matchesSearch && matchesLeague
  })

  const currentHome = TEAMS.find((t) => t.id === homeTeamId) || TEAMS[0]
  const currentAway = TEAMS.find((t) => t.id === awayTeamId) || TEAMS[1]

  const handleSelectTeam = (id: string) => {
    if (activeSide === 'home') {
      if (id === awayTeamId) swap()
      else setHomeTeam(id)
      setActiveSide('away')
    } else {
      if (id === homeTeamId) swap()
      else setAwayTeam(id)
    }
  }

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
            <h1 className="text-2xl font-black italic tracking-wide">Select Teams</h1>
            <p className="text-xs text-white/50">Choose Home and Away clubs for the match</p>
          </div>
        </div>

        {/* Next: Stadium Selection CTA */}
        <button
          onClick={() => navigate('/stadium-selection')}
          className="flex items-center gap-2 bg-ui-accent hover:bg-ui-accent/80 text-black px-6 py-2.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>Select Stadium</span>
        </button>
      </div>

      {/* Matchup Comparison Card */}
      <div className="my-4 bg-ui-card/90 border border-white/10 rounded-2xl p-5 flex items-center justify-between max-w-4xl w-full mx-auto shadow-2xl">
        {/* Home Side Card */}
        <div
          onClick={() => setActiveSide('home')}
          className={`flex-1 p-4 rounded-xl border transition-all cursor-pointer ${
            activeSide === 'home'
              ? 'border-ui-accent bg-ui-accent/10 shadow-[0_0_15px_rgba(0,212,255,0.25)]'
              : 'border-white/10 bg-white/5 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-ui-accent">
              Home Team
            </span>
            <span className="text-xs text-white/60 font-mono">{currentHome.league}</span>
          </div>
          <div className="text-xl font-black truncate">{currentHome.name}</div>
          <div className="text-xs text-white/50 mt-1 flex items-center gap-3">
            <span>OVR: <strong className="text-white">{currentHome.overallRating}</strong></span>
            <span>ATT: <strong className="text-emerald-400">{currentHome.attackRating}</strong></span>
            <span>DEF: <strong className="text-cyan-400">{currentHome.defenceRating}</strong></span>
          </div>
        </div>

        {/* Swap Button */}
        <div className="px-4">
          <button
            onClick={swap}
            title="Swap sides"
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Away Side Card */}
        <div
          onClick={() => setActiveSide('away')}
          className={`flex-1 p-4 rounded-xl border transition-all cursor-pointer ${
            activeSide === 'away'
              ? 'border-ui-accent bg-ui-accent/10 shadow-[0_0_15px_rgba(0,212,255,0.25)]'
              : 'border-white/10 bg-white/5 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-ui-accent">
              Away Team
            </span>
            <span className="text-xs text-white/60 font-mono">{currentAway.league}</span>
          </div>
          <div className="text-xl font-black truncate">{currentAway.name}</div>
          <div className="text-xs text-white/50 mt-1 flex items-center gap-3">
            <span>OVR: <strong className="text-white">{currentAway.overallRating}</strong></span>
            <span>ATT: <strong className="text-emerald-400">{currentAway.attackRating}</strong></span>
            <span>DEF: <strong className="text-cyan-400">{currentAway.defenceRating}</strong></span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 max-w-5xl w-full mx-auto mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team name or abbreviation..."
            className="w-full bg-ui-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-ui-accent"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {leagues.map((lg) => (
            <button
              key={lg}
              onClick={() => setLeagueFilter(lg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition cursor-pointer ${
                leagueFilter === lg
                  ? 'bg-ui-accent text-black font-extrabold'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {lg}
            </button>
          ))}
        </div>
      </div>

      {/* Available Teams Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 max-w-5xl w-full mx-auto overflow-y-auto flex-1 pr-1">
        {filteredTeams.map((team) => {
          const isSelectedHome = team.id === currentHome.id
          const isSelectedAway = team.id === currentAway.id

          return (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelectedHome
                  ? 'border-cyan-400 bg-cyan-500/20'
                  : isSelectedAway
                  ? 'border-emerald-400 bg-emerald-500/20'
                  : 'border-white/10 bg-ui-card/80 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: team.colors.primary }}
                />
                <span className="text-[10px] font-mono text-white/60 font-bold">{team.shortName}</span>
              </div>

              <div>
                <div className="font-extrabold text-sm truncate">{team.name}</div>
                <div className="text-[10px] text-white/50">{team.country}</div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-white/10 pt-2 text-white/70">
                <span>Rating</span>
                <span className="font-black text-white">{team.overallRating}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Controls */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-white/50">
        <span>Clicking a team sets the active side ({activeSide.toUpperCase()})</span>
        <button
          onClick={() => navigate('/match-settings')}
          className="text-ui-accent hover:underline cursor-pointer"
        >
          Configure Match Length & Difficulty →
        </button>
      </div>
    </div>
  )
}
