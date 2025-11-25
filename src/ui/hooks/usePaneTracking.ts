import { useEffect, MutableRefObject } from 'react';

interface ContentData {
    contentType?: string;
    [key: string]: any;
}

/**
 * Hook to track the last active chat pane
 * Updates lastActiveChatPaneId when the active pane is a chat pane
 *
 * @param activeContentPaneId - Currently active pane ID
 * @param contentDataRef - Ref to content data for all panes
 * @param setLastActiveChatPaneId - Setter for last active chat pane ID
 */
export const useTrackLastActiveChatPane = (
    activeContentPaneId: string | null,
    contentDataRef: MutableRefObject<Record<string, ContentData>>,
    setLastActiveChatPaneId: (id: string) => void
): void => {
    useEffect(() => {
        if (activeContentPaneId) {
            const paneData = contentDataRef.current[activeContentPaneId];
            if (paneData && paneData.contentType === 'chat') {
                setLastActiveChatPaneId(activeContentPaneId);
            }
        }
    }, [activeContentPaneId, contentDataRef, setLastActiveChatPaneId]);
};

export default useTrackLastActiveChatPane;
