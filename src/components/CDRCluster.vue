<template>
  <div class="cdr-container">
    <div>
      <svg class="cdr-plot"></svg>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
export default {
  name: 'CDRCluster',
  data () {
    return {
      'data':[],//[{'x':11.5,'y':15.6,'group':'1'},...]

      'raw_range':undefined,//{'x':[xMin,xMax],'y':[yMin,yMax]},
      'padding':10,
    }
  },
  methods:{

    /**
     * 
     * 外用接口
     * 
     */

    setData(data=[]){
      this.data = data;
    },

    setRawRange(raw_range=undefined){
      this.raw_range = raw_range;
    },

    draw(range_mode='raw'){

      /**
       * 
       * range_mode：
       *    'fit'：使用当前data的最大范围作为range，不改变raw_range
       *    'fit_set'：使用当前data的最大范围作为range，并且把生成的range作为raw_range
       *    'raw'：使用当前raw_range作为range，如果raw_range为undefined，则使用fit_set模式
       * 
       */

      const svg = d3.select('.cdr-plot')

      //清理画布
      svg.selectAll('*').remove();

      //获取大小
      const width = svg.node().getBoundingClientRect().width;
      const height = svg.node().getBoundingClientRect().height;

      //判断特例
      if(this.data === undefined || this.data === null || this.data.length == 0)
          return;
      if(width <= 2 * this.padding || height <= 2 * this.padding){
          return;
      } 

      //获取range
      let range;
      if(range_mode == 'raw' && this.raw_range !== undefined){
        range = this.raw_range
      }
      else if(range_mode == 'fit'){
        range = {
          'x':[Math.min(...this.data.map(v=>v.x)),Math.max(...this.data.map(v=>v.x))],
          'y':[Math.min(...this.data.map(v=>v.y)),Math.max(...this.data.map(v=>v.y))]
        }
      }
      else if(range_mode == 'fit_set'  || this.raw_range === undefined){
        range = {
          'x':[Math.min(...this.data.map(v=>v.x)),Math.max(...this.data.map(v=>v.x))],
          'y':[Math.min(...this.data.map(v=>v.y)),Math.max(...this.data.map(v=>v.y))]
        }
        this.raw_range = range;
      }
      else{;}

      //定义scale
      const xScale = d3.scaleLinear()
        .domain(range.x)
        .range([this.padding,width-this.padding])
      const yScale = d3.scaleLinear()
        .domain(range.y)
        .range([this.padding,height-this.padding])

      //分组，分配颜色
      let groups = d3.group(this.data,d=>d.group)
      let group_keys = Array.from(groups.keys())
      let group_color = {}
      for(let i = 0;i < group_keys.length;i++){
        group_color[group_keys[i]] = d3.interpolateRainbow(1.0 * i / group_keys.length)
      }
 
      //绘图
      const scatter = svg.append('g')
        .selectAll('*')
        .data(this.data)
        .join('circle')
        .attr("cx",(d)=>xScale(d.x))
        .attr("cy",(d)=>yScale(d.y))
        .attr("r",6)
        .attr("fill",d=>group_color[d.group])
        .attr("fill-opacity",0.6)
        .attr("stroke",d=>group_color[d.group])
        .attr("stroke-width","1px")


    },

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

  .cdr-container{
    height:100%;
    width: 100%;
  }
  .cdr-plot{
    width: 80%;
    height:80%;
  }

</style>
