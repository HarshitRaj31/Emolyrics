import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { INITIAL_PLUGINS } from "../data/pluginsData";

const STORAGE_KEY = "emolyrics_plugins_v1";

const PluginContext = createContext(null);

export function PluginProvider({ children }) {
  // Initialize from localStorage or fallback to INITIAL_PLUGINS defaults
  const [plugins, setPlugins] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initial catalog to ensure new fields/plugins are always present
        return INITIAL_PLUGINS.map((initPlugin) => {
          const userState = parsed.find((p) => p.id === initPlugin.id);
          if (userState) {
            return {
              ...initPlugin,
              isInstalled: userState.isInstalled,
              isEnabled: userState.isEnabled,
              config: {
                ...initPlugin.settingsFields?.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}),
                ...userState.config
              }
            };
          }
          return {
            ...initPlugin,
            isInstalled: initPlugin.defaultInstalled,
            isEnabled: initPlugin.defaultEnabled,
            config: initPlugin.settingsFields?.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}) || {}
          };
        });
      }
    } catch (e) {
      console.warn("Failed to load plugin state from localStorage:", e);
    }

    // Default state
    return INITIAL_PLUGINS.map((plugin) => ({
      ...plugin,
      isInstalled: plugin.defaultInstalled,
      isEnabled: plugin.defaultEnabled,
      config: plugin.settingsFields?.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}) || {}
    }));
  });

  // Notification toast state for user feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Persist plugin changes to localStorage
  useEffect(() => {
    try {
      const minimalState = plugins.map((p) => ({
        id: p.id,
        isInstalled: p.isInstalled,
        isEnabled: p.isEnabled,
        config: p.config
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
    } catch (e) {
      console.warn("Failed to persist plugin state to localStorage:", e);
    }
  }, [plugins]);

  // Install a plugin
  const installPlugin = useCallback((pluginId) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId) {
          return { ...p, isInstalled: true, isEnabled: true };
        }
        return p;
      })
    );
    const target = plugins.find((p) => p.id === pluginId);
    showToast(`Installed ${target ? target.name : "Plugin"} and enabled by default`, "success");
  }, [plugins, showToast]);

  // Uninstall a plugin
  const uninstallPlugin = useCallback((pluginId) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId) {
          return { ...p, isInstalled: false, isEnabled: false };
        }
        return p;
      })
    );
    const target = plugins.find((p) => p.id === pluginId);
    showToast(`Uninstalled ${target ? target.name : "Plugin"}`, "info");
  }, [plugins, showToast]);

  // Toggle enable/disable
  const togglePlugin = useCallback((pluginId) => {
    let nextState = false;
    let targetName = "Plugin";
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId) {
          nextState = !p.isEnabled;
          targetName = p.name;
          return { ...p, isEnabled: nextState };
        }
        return p;
      })
    );
    showToast(
      `${targetName} is now ${nextState ? "Enabled" : "Disabled"}`,
      nextState ? "success" : "info"
    );
  }, [showToast]);

  // Update plugin configuration
  const updatePluginConfig = useCallback((pluginId, newConfig) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId) {
          return {
            ...p,
            config: { ...p.config, ...newConfig }
          };
        }
        return p;
      })
    );
    showToast("Configuration saved successfully", "success");
  }, [showToast]);

  // Check if a plugin is currently active (both installed and enabled)
  const isPluginActive = useCallback(
    (pluginId) => {
      const plugin = plugins.find((p) => p.id === pluginId);
      return Boolean(plugin && plugin.isInstalled && plugin.isEnabled);
    },
    [plugins]
  );

  // Get plugin details by id
  const getPlugin = useCallback(
    (pluginId) => {
      return plugins.find((p) => p.id === pluginId) || null;
    },
    [plugins]
  );

  // Reset all to defaults
  const resetToDefaults = useCallback(() => {
    setPlugins(
      INITIAL_PLUGINS.map((plugin) => ({
        ...plugin,
        isInstalled: plugin.defaultInstalled,
        isEnabled: plugin.defaultEnabled,
        config: plugin.settingsFields?.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {}) || {}
      }))
    );
    showToast("Reset all plugins to default registry state", "info");
  }, [showToast]);

  // Memoized stats
  const stats = useMemo(() => {
    const total = plugins.length;
    const installed = plugins.filter((p) => p.isInstalled).length;
    const active = plugins.filter((p) => p.isInstalled && p.isEnabled).length;
    return { total, installed, active };
  }, [plugins]);

  const value = useMemo(
    () => ({
      plugins,
      stats,
      toast,
      dismissToast,
      installPlugin,
      uninstallPlugin,
      togglePlugin,
      updatePluginConfig,
      isPluginActive,
      getPlugin,
      resetToDefaults
    }),
    [
      plugins,
      stats,
      toast,
      dismissToast,
      installPlugin,
      uninstallPlugin,
      togglePlugin,
      updatePluginConfig,
      isPluginActive,
      getPlugin,
      resetToDefaults
    ]
  );

  return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
}

export function usePlugins() {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("usePlugins must be used within a PluginProvider");
  }
  return context;
}

