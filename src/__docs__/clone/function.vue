<template>
  <div class="flex">
    <section ref="el1" class="flex flex-col gap-2 p-4 w-300px bg-gray-500/5 rounded">
      <div v-for="item in list1" :key="item.id" class="cursor-move h-50px bg-gray-500/5 rounded p-3">
        {{ item.name }}
      </div>
    </section>
    <section ref="el2" class="flex flex-col gap-2 p-4 w-300px m-auto bg-gray-500/5 rounded overflow-auto">
      <div v-for="item in list2" :key="item.id" class="cursor-move h-50px bg-gray-500/5 rounded p-3">
        {{ item.name }}
      </div>
    </section>
  </div>
  <div class="flex justify-between">
    <preview-list :list="list1" />
    <preview-list :list="list2" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useDraggable } from 'vue-draggable-plus'
const list1 = ref([
  {
    name: 'Joao',
    id: '1'
  },
  {
    name: 'Jean',
    id: '2'
  },
  {
    name: 'Johanna',
    id: '3'
  },
  {
    name: 'Juan',
    id: '4'
  }
])
const list2 = ref(
  list1.value.map(item => ({
    name: `${item.name}-2`,
    id: `${item.id}-2`
  }))
)

const el1 = ref()
const el2 = ref()
useDraggable({
  el: el1,
  list: list1,
  options: {
    animation: 150,
    group: { name: 'people', pull: 'clone', put: false },
    sort: false,
    onClone() {
      console.log('clone');
    }
  }
});

useDraggable({
  el: el2,
  list: list2,
  options: {
    animation: 150,
    group: 'people'
  }
});
</script>
