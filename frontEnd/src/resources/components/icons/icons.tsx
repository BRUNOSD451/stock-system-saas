import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Box,
  ChevronRight,
  Grid2X2,
  Home,
  List,
  LogOut,
  Plus,
  Search,
  Settings,
  Tag,
  Truck,
  Users,
} from "lucide-react";

const navigationIconProps = {
  size: 18,
  strokeWidth: 1.8,
  "aria-hidden": true,
} as const;

const utilityIconProps = {
  size: 16,
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

export const I = {
  box: <Box {...navigationIconProps} />,
  arrowDown: <ArrowDown {...navigationIconProps} />,
  arrowUp: <ArrowUp {...navigationIconProps} />,
  tag: <Tag {...navigationIconProps} />,
  alert: <AlertTriangle {...navigationIconProps} />,
  truck: <Truck {...navigationIconProps} />,
  users: <Users {...navigationIconProps} />,
  home: <Home {...navigationIconProps} />,
  grid: <Grid2X2 {...navigationIconProps} />,
  search: <Search {...utilityIconProps} />,
  bell: <Bell {...utilityIconProps} />,
  settings: <Settings {...utilityIconProps} />,
  logout: <LogOut {...utilityIconProps} />,
  plus: <Plus size={14} strokeWidth={2.5} aria-hidden />,
  chevRight: <ChevronRight size={14} strokeWidth={2} aria-hidden />,
  list: <List {...navigationIconProps} />,
  arrowRight: <ArrowRight size={18} strokeWidth={2} aria-hidden />,
};
