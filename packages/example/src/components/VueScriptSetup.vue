<template>
  <div @click="handleClick">Hello {{ animal }}</div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import mitt from "../utils/event-bus";

const emitter = mitt();
interface Props {
  animal: string;
  name: AnimaleName;
  age: number;
}
type AnimaleName = "lily" | "tom" | "jelly";

const props: Props = defineProps({
  // 小动物名称
  animal: { type: String, default: "tom", required: true },

  // 小动物名称
  name: {
    type: String as PropType<"lily" | "tom" | "jelly">,
    default: "tom",
    required: false,
  },

  // 小动物名称
  name2: {
    type: String as PropType<AnimaleName>,
    default: "tom",
    required: false,
  },

  // 小动物名称
  name3: {
    type: Array as PropType<AnimaleName[]>,
    default: "tom",
    required: false,
  },

  // 小动物年龄
  age: { type: Number, default: 2, required: false },
});

const emit = defineEmits(["rename"]);

function handleClick() {
  emitter.emit("rename", { value: "new name", old: "old name" });
}
</script>
