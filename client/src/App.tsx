import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ReportLayout from "./components/ReportLayout";
import SourceDataPage from "./pages/SourceDataPage";
import RenwangDataPage from "./pages/RenwangDataPage";
import DailyDataPage from "./pages/DailyDataPage";
import DeptPage from "./pages/DeptPage";
import ChannelPage from "./pages/ChannelPage";
import HrPage from "./pages/HrPage";
import TrackingPage from "./pages/TrackingPage";
import CoreNetworkPage from "./pages/CoreNetworkPage";
import DataSourcePage from "./pages/DataSourcePage";
import SettingsPage from "./pages/SettingsPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <Redirect to="/import/source" />
      </Route>
      {/* Import Data - 3 independent sub-pages */}
      <Route path={"/import/source"}>
        <ReportLayout>
          <SourceDataPage />
        </ReportLayout>
      </Route>
      <Route path={"/import/renwang"}>
        <ReportLayout>
          <RenwangDataPage />
        </ReportLayout>
      </Route>
      <Route path={"/import/daily"}>
        <ReportLayout>
          <DailyDataPage />
        </ReportLayout>
      </Route>
      <Route path={"/import"}>
        <Redirect to="/import/source" />
      </Route>
      {/* Dept - single page with top tabs */}
      <Route path={"/dept"}>
        <ReportLayout>
          <DeptPage />
        </ReportLayout>
      </Route>
      {/* Other report pages */}
      <Route path={"/channel"}>
        <ReportLayout>
          <ChannelPage />
        </ReportLayout>
      </Route>
      <Route path={"/hr"}>
        <ReportLayout>
          <HrPage />
        </ReportLayout>
      </Route>
      <Route path={"/tracking"}>
        <ReportLayout>
          <TrackingPage />
        </ReportLayout>
      </Route>
      <Route path={"/core-network"}>
        <ReportLayout>
          <CoreNetworkPage />
        </ReportLayout>
      </Route>
      <Route path={"/data-source"}>
        <ReportLayout>
          <DataSourcePage />
        </ReportLayout>
      </Route>
      <Route path={"/settings"}>
        <ReportLayout>
          <SettingsPage />
        </ReportLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
