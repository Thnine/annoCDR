<template>
  <div class="cdr-container">
    <div class="cdr-plot-container">
      <svg class="cdr-plot"></svg>
      <svg class="cdr-plot-legend"></svg>
    </div>
    <div class="cdr-controller">
      <el-radio-group v-model="link_mode" size="medium">
        <el-radio-button label="No-link"></el-radio-button>
        <el-radio-button label="Must-link"></el-radio-button>
        <el-radio-button label="Cannot-link"></el-radio-button>
      </el-radio-group>
      <div class="cdr-controller-button-group">
        <el-button size="medium" type="success">标注</el-button>
        <el-button size="medium" type="success">导出</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import lasso from "./d3-lasso";
import {Button,RadioButton,RadioGroup} from 'element-ui'
import Vue from 'vue'

Vue.component(Button.name,Button)
Vue.component(RadioButton.name,RadioButton)
Vue.component(RadioGroup.name,RadioGroup)


export default {
  name: 'CDRCluster',
  data () {
    return {
      'data':[],//[{'x':11.5,'y':15.6,'group':'1'},...]
      'raw_range':undefined,//{'x':[xMin,xMax],'y':[yMin,yMax]},
      'groups':{},//{'groud_id':{'color':'#000000',...},...}
      'padding':20,//scatter-plot的padding;

      'link_mode':'No-link', //Must-link,Cannot-link,No-link 三种模式
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
      let group_keys = Array.from(d3.group(this.data,d=>d.group).keys())
      let groups = {}
      for(let i = 0;i < group_keys.length;i++){
        groups[group_keys[i]] = {
          'color':d3.interpolateRainbow(1.0 * i / group_keys.length)
        }
      }
      this.groups = groups; 

      //绘图
      const scatter = svg.append('g')
        .selectAll('*')
        .data(this.data)
        .join('circle')
        .attr("cx",(d)=>xScale(d.x))
        .attr("cy",(d)=>yScale(d.y))
        .attr("r",6)
        .attr("fill",d=>this.groups[d.group].color)
        .attr("fill-opacity",0.6)
        .attr("stroke",d=>this.groups[d.group].color)
        .attr("stroke-width","1px")
      
      //绘制legend
      this.drawLegend()
    },
    update(){
      // 仅更新点的位置、group，不更新raw_range和groups中的信息
    },
    setLasso(){//设置lasso
        //lasso
        var lasso_start = () => {
        ls.items().classed("unchosen", true).classed("chosen", false).classed("possible", false);
        newChosenNodes = [];
            d3.selectAll(".scatter-legend-item")
                .classed("chosen",false);
        };
        var lasso_draw = () => {
            ls.possibleItems().classed("unchosen", false).classed("chosen", false).classed("possible", true);
            ls.notPossibleItems().classed("unchosen", true).classed("chosen", false).classed("possible", false);
        };
        var lasso_end = () => {
            ls.items().classed("unchosen", true).classed("chosen", false).classed("possible", false);
            ls.selectedItems().classed("unchosen", false).classed("chosen", true).classed("possible", false).dispatch("chosen");
            this.$store.commit(`updateChosenData`, newChosenNodes);
        };
        var ls = lasso()
            .closePathSelect(true)
            .closePathDistance(100)
            .items(circles)
            .targetArea(svg)
            .on("start", lasso_start)
            .on("draw", lasso_draw)
            .on("end", lasso_end);
        ls.closePathDistance(2000);
        svg.call(ls);
    },
    drawLegend(){//根据group中的数据绘制legend
      
      const svg = d3.select('.cdr-plot-legend')

      //清空画布
      svg.selectAll('*').remove();

      //处理异常
      if(this.groups === undefined || this.groups === null || Object.keys(this.groups).length == 0)
        return;

      const unitWidth = 50;
      const unitHeight = 40;
      const textSize = 22;
      const height = svg.node().getBoundingClientRect().height;

      //包装this.groups为array

      const legendUnit = svg.selectAll('*')
        .data(Object.keys(this.groups))
        .join('g')
        .attr('transform',function(d,i){
          //计算一列能有多少个legendUnit
          let columnMax = Math.floor(height/unitHeight);
          return `translate(${Math.floor(i / columnMax) * unitWidth},${(i % columnMax) * unitHeight})`
        })
      
      //legend circle
      legendUnit.append('circle')
        .attr('cx',0.3 * unitWidth)
        .attr('cy',0.5 * unitHeight)
        .attr('r',8)
        .attr("fill",d=>this.groups[d].color)
      //legend text
      legendUnit.append('text')
        .text(d=>d)
        .attr('font-size',textSize)
        .attr('x',d=>0.6 * unitWidth)
        .attr('y',function(d){
          return 0.5 * unitHeight + 0.4 * textSize;
        })
      
    }



  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

  .cdr-container{
    height:100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .cdr-plot-container{
    width:100%;
    display: flex;
    overflow-x:auto;
    flex:1 1 0;
  }


  .cdr-plot{
    width: 80%;
    height:100%;
  }

  .cdr-plot-legend{
    height:100%;
  }

  .cdr-controller{
    width:100%;
    padding-top:20px;
    display: flex;
    padding-left: 10px;
  }

  .cdr-controller-button-group{
    display: flex;
    padding-left: 30px;
  }



/* lasso */
/* .lasso {
    path {
        fill-opacity: 0.6;
        stroke: rgb(64, 169, 255);
        stroke-width: 2px;
    }
    .lasso {
        .drawn {
            fill-opacity: 0.05;
        }
        .loop_close {
            fill: none;
            stroke-dasharray: 4, 4;
        }
        .lasso .origin {
            fill: #3399ff;
            fill-opacity: 0.5;
        }
    }
} */
</style>
