<script setup lang="ts">
const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  width: {
    type: [String, Number],
    default: undefined,
  },
  height: {
    type: [String, Number],
    default: undefined,
  },
})

</script>

<template>
  <div>
    <NuxtImg :src="props.src" :alt="props.alt" :placeholder="[300, 200, 75, 5]"/>
  </div>
</template>
