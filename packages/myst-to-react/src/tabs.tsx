import classNames from 'classnames';
import type { GenericNode } from 'myst-common';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTabSet, type NodeRenderer } from '@myst-theme/providers';
import { MyST } from './MyST.js';

interface TabItem extends GenericNode {
  key: string;
  html_id?: string;
  title: string;
  sync?: string;
  selected?: boolean;
}

/** DOM event sent to a hidden tab item to ask it to become the active tab of its set */
export const OPEN_TAB_EVENT = 'myst:open-tab';

type TabSetState = { active: string; setActive: (id: string) => void };
const TabSetContext = createContext<TabSetState | undefined>(undefined);

// Create a provider for components to consume and subscribe to changes
function TabSetStateProvider({
  active,
  setActive,
  children,
}: {
  active: string;
  setActive: (id: string) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ active, setActive }), [active, setActive]);
  return <TabSetContext.Provider value={value}>{children}</TabSetContext.Provider>;
}

/**
 * Make sure that `el` is visible, by activating the tabs that contain it (if any).
 * Returns true if at least one tab had to be switched.
 */
export function openTabs(el: HTMLElement | null): boolean {
  let opened = false;
  for (let node = el; node; node = node.parentElement) {
    if (node.dataset?.tabItem != null && node.classList.contains('hidden')) {
      node.dispatchEvent(new CustomEvent(OPEN_TAB_EVENT));
      opened = true;
    }
  }
  return opened;
}

type Tab = { title: string | React.ReactNode; id: string; sync?: string; selected?: boolean };

/** Activate the tab(s) holding the element targeted by the URL fragment, on load and on hash change */
function useRevealHash() {
  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      // MyST lower-cases the ids generated from labels
      const el = document.getElementById(id) ?? document.getElementById(id.toLowerCase());
      // the tab switch needs a render before the target can be scrolled to
      if (openTabs(el)) requestAnimationFrame(() => el?.scrollIntoView());
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
}

export function TabSet({
  tabs,
  children,
  className,
}: {
  tabs: Tab[];
  children: React.ReactNode;
  className?: string;
}) {
  useRevealHash();
  const [lastClickedTab, onClickSyncedTab] = useTabSet() ?? [];
  const [active, setActive] = useState<string>(tabs.find((t) => t.selected)?.id ?? tabs?.[0]?.id);
  const onClick = (tab: Tab) => {
    setActive(tab.id);
    if (tab.sync) {
      if (!onClickSyncedTab) {
        console.error('TabStateProvider is not defined, synced tabs will not work.');
      }
      onClickSyncedTab?.(tab.sync);
    }
  };

  useEffect(() => {
    if (!lastClickedTab) return;
    const tab = tabs.find((item) => item.sync === lastClickedTab);
    if (!tab) return;
    setActive(tab?.id);
  }, [tabs, lastClickedTab, setActive]);

  return (
    <TabSetStateProvider active={active} setActive={setActive}>
      <div className={classNames('myst-tab-set my-5', className)}>
        <div className="myst-tab-set-row flex flex-row flex-wrap overflow-x-auto border-b border-b-myst-border">
          {tabs.map((tab) => {
            return (
              <div
                key={tab.id}
                className={classNames(
                  'myst-tab-item-header flex-none px-3 py-1 font-semibold cursor-pointer',
                  {
                    'myst-tab-item-header-active text-myst-active border-b-2 border-b-myst-active':
                      active === tab.id,
                    'myst-tab-item-header-inactive text-myst-text-tertiary hover:text-myst-text-secondary':
                      active !== tab.id,
                  },
                )}
                onClick={() => onClick(tab)}
              >
                {tab.title}
              </div>
            );
          })}
        </div>
        <div className="myst-tab-item-body flex shadow">
          <div className="myst-tab-item-text w-full px-6">{children}</div>
        </div>
      </div>
    </TabSetStateProvider>
  );
}

export function TabItem({
  id,
  htmlId,
  children,
  className,
}: Omit<Tab, 'title' | 'sync'> & {
  htmlId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { active, setActive } = useContext(TabSetContext) ?? {};
  const open = active === id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // let links and the table of contents switch to this tab
    const div = ref.current;
    if (!div || !setActive) return;
    const onOpen = () => setActive(id);
    div.addEventListener(OPEN_TAB_EVENT, onOpen);
    return () => div.removeEventListener(OPEN_TAB_EVENT, onOpen);
  }, [id, setActive]);
  return (
    <div
      ref={ref}
      id={htmlId}
      data-tab-item=""
      className={classNames({ hidden: !open }, className)}
    >
      {children}
    </div>
  );
}

export const TabSetRenderer: NodeRenderer = ({ node, className }) => {
  // Only the tab items of this set: those of a nested tab-set belong to that one
  const items = (node.children ?? []).filter((child: GenericNode) => child.type === 'tabItem') as TabItem[];
  // Add the key as the ID (key is special in react)
  const tabs = items.map((tab) => ({
    title: tab.title,
    id: tab.key,
    sync: tab.sync,
    selected: tab.selected,
  }));
  return (
    <TabSet tabs={tabs} className={className}>
      <MyST ast={node.children} />
    </TabSet>
  );
};

export const TabItemRenderer: NodeRenderer<TabItem> = ({ node, className }) => {
  return (
    <TabItem id={node.key} htmlId={node.html_id} className={className}>
      <MyST ast={node.children} />
    </TabItem>
  );
};

const TAB_RENDERERS: Record<string, NodeRenderer> = {
  tabSet: TabSetRenderer,
  tabItem: TabItemRenderer,
};

export default TAB_RENDERERS;
