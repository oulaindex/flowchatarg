// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type { MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import {
  ResourceMentions,
  type ResourceMentionsProps,
} from "./resource-mentions";
import type { Instance, Props } from "tippy.js";
import tippy from "tippy.js";
import { resolveServiceURL } from "~/core/api/resolve-service-url";
import type { Resource } from "~/core/messages";

export const resourceSuggestion: MentionOptions["suggestion"] = {
  items: ({ query }) => {
    return fetch(resolveServiceURL(`rag/resources?query=${query}`), {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) => {
        return res.resources as Array<Resource>;
      })
      .catch((err) => {
        return [];
      });
  },

  render: () => {
    let reactRenderer: ReactRenderer<
      { onKeyDown: (args: { event: KeyboardEvent }) => boolean },
      ResourceMentionsProps
    >;
    let popup: Instance<Props>[] | null = null;

    return {
      onStart: (props) => {
        reactRenderer = new ReactRenderer(ResourceMentions, {
          props,
          editor: props.editor,
        });

        const getReferenceClientRect = () => {
          // 1. Try props.clientRect()
          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect && (rect.width > 0 || rect.height > 0 || rect.top > 0 || rect.left > 0)) {
              return rect;
            }
          }

          // 2. Try coordsAtPos
          const selection = props.editor.state.selection;
          const coords = props.editor.view.coordsAtPos(selection.from);
          if (coords && (coords.top > 0 || coords.left > 0)) {
            return {
              top: coords.top,
              left: coords.left,
              right: coords.right,
              bottom: coords.bottom,
              width: 0,
              height: (coords.bottom - coords.top) || 20, // Default height if 0
            };
          }

          // 3. Try native selection
          const nativeSelection = window.getSelection();
          if (nativeSelection && nativeSelection.rangeCount > 0) {
            const range = nativeSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect && (rect.width > 0 || rect.height > 0 || rect.top > 0 || rect.left > 0)) {
              return rect;
            }
          }

          // 4. Fallback to editor bounding rect (to avoid 0,0 at top-left)
          if (props.editor.view.dom) {
            return props.editor.view.dom.getBoundingClientRect();
          }

          return {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
          };
        };

        popup = tippy("body", {
          getReferenceClientRect: getReferenceClientRect as any,
          appendTo: () => document.body,
          content: reactRenderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "top-start",
        });
      },

      onUpdate(props) {
        if (reactRenderer) {
          reactRenderer.updateProps(props);
        }

        if (popup?.[0] && !popup[0].state.isDestroyed) {
          const getReferenceClientRect = () => {
            // 1. Try props.clientRect()
            if (props.clientRect) {
              const rect = props.clientRect();
              if (rect && (rect.width > 0 || rect.height > 0 || rect.top > 0 || rect.left > 0)) {
                return rect;
              }
            }

            // 2. Try coordsAtPos
            const selection = props.editor.state.selection;
            const coords = props.editor.view.coordsAtPos(selection.from);
            if (coords && (coords.top > 0 || coords.left > 0)) {
              return {
                top: coords.top,
                left: coords.left,
                right: coords.right,
                bottom: coords.bottom,
                width: 0,
                height: (coords.bottom - coords.top) || 20,
              };
            }

            // 3. Try native selection
            const nativeSelection = window.getSelection();
            if (nativeSelection && nativeSelection.rangeCount > 0) {
              const range = nativeSelection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              if (rect && (rect.width > 0 || rect.height > 0 || rect.top > 0 || rect.left > 0)) {
                return rect;
              }
            }

            // 4. Fallback to editor bounding rect
            if (props.editor.view.dom) {
              return props.editor.view.dom.getBoundingClientRect();
            }

            return {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: 0,
              height: 0,
            };
          };

          popup[0].setProps({
            getReferenceClientRect: getReferenceClientRect as any,
          });
        }
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();

          return true;
        }

        return reactRenderer.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup?.[0]?.destroy();
        reactRenderer.destroy();
      },
    };
  },
};
