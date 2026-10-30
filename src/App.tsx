import { Routes, Route, Navigate } from 'react-router-dom'
import MainMenu from '@/menus/MainMenu'
import TeamSelection from '@/menus/TeamSelection'
import StadiumSelection from '@/menus/StadiumSelection'
import SquadManagement from '@/menus/SquadManagement'
import KitSelection from '@/menus/KitSelection'
import TacticsScreen from '@/menus/TacticsScreen'
import MatchSettings from '@/menus/MatchSettings'
import MatchScene from '@/scenes/MatchScene'
import SettingsScreen from '@/menus/SettingsScreen'
import CareerMenu from '@/menus/CareerMenu'
import TournamentMenu from '@/menus/TournamentMenu'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/team-selection" element={<TeamSelection />} />
      <Route path="/stadium-selection" element={<StadiumSelection />} />
      <Route path="/squad" element={<SquadManagement />} />
      <Route path="/kit" element={<KitSelection />} />
      <Route path="/tactics" element={<TacticsScreen />} />
      <Route path="/match-settings" element={<MatchSettings />} />
      <Route path="/match" element={<MatchScene />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/career" element={<CareerMenu />} />
      <Route path="/tournament" element={<TournamentMenu />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
