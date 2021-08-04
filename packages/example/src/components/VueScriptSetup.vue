<template>
  <div @click="handleClick">Hello {{ animal }}</div>
</template>

<script setup lang="ts">
import mitt from "../utils/event-bus";

const emitter = mitt();
interface Props {
  animal: string;
}

const props: Props = defineProps({
  // 小动物名称
  animal: { type: String, default: "tom", required: true },

  // 小动物年龄
  age: { type: Number, default: 2, required: false },
});

const emit = defineEmits(["rename"]);

function handleClick() {
  emitter.emit("rename", { value: "new name", old: "old name" });
}
</script>
