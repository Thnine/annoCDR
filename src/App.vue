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

import {train} from '@/request/train.js'

export default {
  name: 'App',
  components: {
    CDRCluster
  },
  methods:{
    start(){
      // const random_arr = (n, m) => {
      //   let arr = []
      //   for (let i = 0; i < n; i++) {
      //     let ele = []
      //     for (let j = 0; j < m; j++) {
      //       ele.push(Math.random())
      //     }
      //     arr.push(ele)
      //   }
      //   return arr
      // }
      // let matrix = random_arr(100,50)
      // d3.json('static/5group_high.json').then(matrix=>{
      //     console.log(matrix)
      //     train(matrix).then((response)=>{
      //     console.log(response.data)
      //     let embedding = response.data.embeddings;
      //     let label = response.data.label;
      //     let data = []
      //     for(let i = 0;i < embedding.length;i++){
      //       data.push({'x':embedding[i][0],'y':embedding[i][1],'group':label[i]})
      //     }
      //     this.$refs['cdr-cluster'].setData(data);
      //     this.$refs['cdr-cluster'].draw();
      //     })
      // })


      

      d3.json('static/5group.json').then(data=>{
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
  width:800px;
  height: 600px;
}
</style>
