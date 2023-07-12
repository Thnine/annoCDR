<template>
  <div id="app">
    <button @click="start">start</button>
    <div class="test-area">
      <CDRCluster ref="cdr-cluster"/>
    </div>
    
  </div>
</template>

<script>
import CDRCluster from '@/components/CDRCluster'

import * as d3 from 'd3'

export default {
  name: 'App',
  components: {
    CDRCluster
  },
  methods:{
    start(){
      d3.json('static/data2.json').then(data=>{
        this.$refs['cdr-cluster'].setData(data)
        this.$refs['cdr-cluster'].draw()
      })
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.test-area{
  width:600px;
  height: 600px;
}
</style>
