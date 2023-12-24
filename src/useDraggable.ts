// Importing from 'sortablejs'
import Sortable, { type Options, type SortableEvent } from 'sortablejs';

// Importing Vue composition functions and types
import { unref, watch } from 'vue-demi';
import type { Ref } from 'vue-demi';

// Importing custom types
import type { RefOrElement, RefOrValue } from './types';

// Importing utilities
import { forEachObject, insertElement, isHTMLElement, isString, isUndefined, mergeOptionsEvents, moveArrayElement, removeElement, tryOnMounted, tryOnUnmounted } from './utils';


function defaultClone<T>(element: T): T {
  if (element === undefined || element === null) return element
  return JSON.parse(JSON.stringify(element))
}

const CLONE_ELEMENT_KEY = Symbol('cloneElement')

interface DraggableEvent extends SortableEvent {
  item: HTMLElement & { [CLONE_ELEMENT_KEY]: any }
}
type SortableMethod = 'closest' | 'save' | 'toArray' | 'destroy' | 'option'

export interface UseDraggableReturn extends Pick<Sortable, SortableMethod> {
  /**
   * Start the sortable.
   * @param {HTMLElement} target - The target element to be sorted.
   * @default By default the root element of the VueDraggablePlus instance is used
   */
  start: (target?: HTMLElement) => void
  pause: () => void
  resume: () => void
}

export interface UseDraggableOptions<T> extends Options {
  clone?: (element: T) => T
  immediate?: boolean
  customUpdate?: (event: SortableEvent) => void
}

export interface UseDraggableParams<T> {
  el: RefOrElement;
  list: Ref<T[]>;
  options?: RefOrValue<UseDraggableOptions<T>>;
}

/**
 * A custom Composition API utility that allows you to drag and drop elements in lists.
 * @param {UseDraggableParams<T>} params - The parameters object containing:
 *   @param {Ref<HTMLElement | null | undefined> | string} el - The element or selector string for the draggable container.
 *   @param {Ref<T[]> | undefined} list - Optional. A ref to the array of items to be draggable.
 *   @param {RefOrValue<UseDraggableOptions<T>> | undefined} options - Optional. The configuration options for draggable behavior.
 * @returns {UseDraggableReturn} - An object containing methods and properties to control and interact with the draggable feature.
 */
export function useDraggable<T>({ el, list, options }: UseDraggableParams<T>): UseDraggableReturn {
  // Set default values for options
  const optionsUnref = unref(options) || {};
  const {
    immediate = true,
    clone = defaultClone,
    customUpdate
  } = optionsUnref;

  let instance: Sortable | null = null

  /**
   * Element dragging started
   * @param {DraggableEvent} evt - DraggableEvent
   */
  function onStart(evt: DraggableEvent) {
    evt.item[CLONE_ELEMENT_KEY] = clone(unref(unref(list)?.[evt.oldIndex!]))
  }

  /**
   * Element is dropped into the list from another list
   * @param {DraggableEvent} evt
   */
  function onAdd(evt: DraggableEvent) {
    const fromList = getListFromEl(evt.from);
    // get the object from the original list to get the same object instance, to preserve reactivity
    const item = fromList.value[evt.oldIndex!];
    if (isUndefined(item)) return
    const newList = [...list.value];
    insertElement(newList, evt.newDraggableIndex!, item);
    list.value = newList;
  }

  function getListFromEl(el: HTMLElement) {
    const key = Object.keys(el).find(key => key.startsWith('Sortable'));
    return key && (el as any)[key]?.__list;
  }

  /**
   * Element is removed from the list into another list
   * @param {DraggableEvent} evt
   */
  function onRemove(evt: DraggableEvent) {
    const { oldDraggableIndex } = evt;
    const newList = [...list.value];
    removeElement(newList, oldDraggableIndex!)
    list.value = newList;
  }

  /**
   * Changed sorting within list
   * @param {DraggableEvent} evt
   */
  function onUpdate(evt: DraggableEvent) {
    if (customUpdate) {
      customUpdate(evt)
      return
    }
    const { oldDraggableIndex, newDraggableIndex } = evt
    const newList = [...list.value]
    list.value = moveArrayElement(
      newList,
      oldDraggableIndex!,
      newDraggableIndex!
    )
  }

  /**
   * preset options
   */
  const presetOptions: UseDraggableOptions<T> = {
    onUpdate,
    onStart,
    onAdd,
    onRemove
  }

  function getTarget(target?: HTMLElement) {
    const element = unref(el) as any;
    let finalTarget = target;

    if (!finalTarget) {
      finalTarget = isString(element)
        ? document.querySelector(element)
        : element;
    }

    // @ts-ignore
    if (finalTarget && !isHTMLElement(finalTarget)) finalTarget = finalTarget.$el;

    if (!finalTarget) throw new Error('Root element not found');
    return finalTarget;
  }

  function mergeOptions() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { immediate, clone, ...restOptions } = unref(options) ?? {}
    return mergeOptionsEvents(
      list === null ? {} : presetOptions,
      restOptions
    ) as Options
  }

  const start = (target?: HTMLElement) => {
    target = getTarget(target)
    if (instance) methods.destroy()

    instance = new Sortable(target as HTMLElement, mergeOptions());
    (instance as any).__list = list;
  }

  watch(
    () => options,
    () => {
      if (!instance) return
      forEachObject(mergeOptions(), (key, value) => {
        // @ts-ignore
        instance?.option(key, value)
      })
    },
    { deep: true }
  )

  const methods = {
    option: (name: keyof Options, value?: any) => {
      // @ts-ignore
      return instance?.option(name, value)
    },
    destroy: () => {
      instance?.destroy()
      instance = null
    },
    save: () => instance?.save(),
    toArray: () => instance?.toArray(),
    closest: (...args) => {
      // @ts-ignore
      return instance?.closest(...args)
    }
  } as Pick<Sortable, SortableMethod>

  const pause = () => methods?.option('disabled', true)
  const resume = () => methods?.option('disabled', false)

  tryOnMounted(() => {
    immediate && start()
  })

  tryOnUnmounted(methods.destroy)

  return { start, pause, resume, ...methods }
}
