<template>
  <div class="cdr-container"
    v-loading="loading"
    >
    <el-checkbox v-model="zoomFlag" style="position:absolute;left:15px;bottom:40px" size="mini">zoom</el-checkbox>
    <div class="cdr-controller">
      <el-radio-group v-model="link_mode" size="mini">
        <el-radio-button label="No-link"></el-radio-button>
        <el-radio-button label="Must-link"></el-radio-button>
        <el-radio-button label="Cannot-link"></el-radio-button>
      </el-radio-group>
      <el-button @click="clearLink" style="margin-left:5px" icon="el-icon-delete" type="danger" size="mini"></el-button>
      <div class="cdr-controller-button-group">
        <el-button  @click="exportCDRUpdateParams" size="mini" type="success">更新</el-button>
        <el-popover
            v-model="anno_visible"
            placement="bottom">
            <div>
              <div style="display:flex;align-items:center">
                <b>标注为：</b>
                <el-input v-model="anno_type" style="width:120px" size="mini"></el-input>
              </div>
              <div style="display:flex;margin-top:15px;align-items:center;justify-content:space-around">
                <el-button size="mini" @click="enter_anno">确定</el-button>
                <el-button size="mini" @click="cancel_anno">取消</el-button>
              </div>
            </div>
            <el-button style="margin-left:5px" slot="reference" size="mini" type="success">标注</el-button>
        </el-popover>
        <el-button style="margin-left:5px" @click="exportChosenData" size="mini" type="success">导出</el-button>
      </div>
    </div>
    <div class="cdr-plot-container">
      <div style="height:100%;display:flex;">
        <svg class="cdr-plot"></svg>
        <svg class="cdr-plot-legend"></svg>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import lasso from "./d3-lasso";
import {Button,RadioButton,RadioGroup,Popover} from 'element-ui'
import {update} from '@/request/update'
import Vue from 'vue'

Vue.component(Button.name,Button)
Vue.component(RadioButton.name,RadioButton)
Vue.component(RadioGroup.name,RadioGroup)
Vue.component(Popover.name,Popover)


export default {
  name: 'CDRCluster',
  data () {
    return {
      //plot相关
      'data':[],//[{'x':11.5,'y':15.6,'group':'1'},...]
      'raw_range':undefined,//{'x':[xMin,xMax],'y':[yMin,yMax]},
      'groups':{},//{'groud_id':{'color':'#000000',...},...}
      'raw_group_length':0,//原始的group长度
      'padding':40,//scatter-plot的padding;

      //link相关
      'link_mode':'No-link', //Must-link,Cannot-link,No-link 三种模式
      'to_link':undefined,//保存index
      'must_links':[],//[[1,2],...]
      'cannot_links':[],//[[1,2],...]


      //选中数据
      'chosenData':[],//存放索引

      //标注相关
      'anno_type':'',
      'anno_visible':false,

      //加载相关
      'loading':false,
      //缩放相关
      'zoomFlag':false,
      'old_transform':undefined,

    }
  },
  methods:{
    /**
     * 
     * 外用接口
     * 
     */

    setData(data=[]){//拷贝一份data存放，其他时候尽量不要拷贝，并且初始化
      this.data = JSON.parse(JSON.stringify(data));
      //清空其他数据
      this.link_mode = 'No-link';
      this.to_link = undefined;
      this.must_links.length = 0;
      this.cannot_links.length = 0;
      this.chosenData.length = 0;
      this.anno_type = '';
      this.anno_visible = false;
      this.loading = false;
      this.zoomFlag = false;
      this.old_transform = undefined;
    
    },

    // draw(range_mode='raw'){
    draw(){
      /**
       * 
       * 
       * 初次重绘
       * 按照this.data绘制数据，生成group，生成raw_range
       **/

      const svg = d3.select('.cdr-plot')
      const self = this;

      //清理画布
      svg.selectAll('*').remove();


      //设置宽度，获取大小
      svg.style('width',()=>{
        return d3.select('.cdr-plot-container').node().getBoundingClientRect().width * 0.8
      })
      const width = svg.node().getBoundingClientRect().width;
      const height = svg.node().clientHeight;

      console.log('height:',height)

      //判断特例
      if(this.data === undefined || this.data === null || this.data.length == 0)
          return;
      if(width <= 2 * this.padding || height <= 2 * this.padding){
          return;
      } 

      //为svg添加事件
      svg.on('click',function(event,d){
        if(self.to_link !== undefined){
          d3.selectAll('.cdr-scatter').dispatch('unchoose_link',{'detail':self.to_link})
          self.to_link = undefined;
        }
      })

      //获取range
      let range;
      // if(range_mode == 'raw' && this.raw_range !== undefined){
      //   range = this.raw_range
      // }
      // else if(range_mode == 'fit'){
      //   range = {
      //     'x':[Math.min(...this.data.map(v=>v.x)),Math.max(...this.data.map(v=>v.x))],
      //     'y':[Math.min(...this.data.map(v=>v.y)),Math.max(...this.data.map(v=>v.y))]
      //   }
      // }
      // else if(range_mode == 'fit_set'  || this.raw_range === undefined){
      //   range = {
      //     'x':[Math.min(...this.data.map(v=>v.x)),Math.max(...this.data.map(v=>v.x))],
      //     'y':[Math.min(...this.data.map(v=>v.y)),Math.max(...this.data.map(v=>v.y))]
      //   }
      //   this.raw_range = range;
      // }
      // else{;}
      range = {
          'x':[Math.min(...this.data.map(v=>v.x)),Math.max(...this.data.map(v=>v.x))],
          'y':[Math.min(...this.data.map(v=>v.y)),Math.max(...this.data.map(v=>v.y))]
        }
      this.raw_range = range;

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
      this.raw_group_length = group_keys.length;
      this.groups = groups; 

      //绘图
      const scatter = svg.append('g')
        .classed('cdr-scatter-g',true)
        .selectAll('*')
        .data(this.data)
        .join('circle')
        .classed('cdr-scatter',true)
        .classed('cdr-belink',function(d,i){
          if(self.to_link !== undefined){
            if(self.to_link == i)
              return true;
          }
          for(let x of self.must_links){
            if(x[0] == i)
              return true;
            else if(x[1] == i)
              return true
          }
          for(let x of self.cannot_links){
            if(x[0] == i)
              return true;
            else if(x[1] == i)
              return true
          }
          return false;
        })
        .classed('cdr-chosen',function(d,i){
          if(self.chosenData.find(v=>v==i) !== undefined)
            return true;
          else
            return false;
        })
        .attr("cx",(d)=>xScale(d.x))
        .attr("cy",(d)=>yScale(d.y))
        .attr("r",6)
        .attr("fill",d=>this.groups[d.group].color)
        .attr("fill-opacity",0.6)
        .attr("stroke",d=>this.groups[d.group].color)
        .attr("stroke-width","1px")
        .on('click',function(event,d){
            event.stopPropagation();
            if(self.link_mode == 'No-link')
              return;
            if(self.to_link === undefined){
              let index = self.data.indexOf(d);
              self.to_link = index;
              d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
            }
            else if(self.to_link !== undefined){
              
              let index = self.data.indexOf(d);
              if(index == self.to_link){//点了两个相同的点，就退出
                return;
              }
              if(self.link_mode == 'Must-link'){
                d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
                self.must_links.push([self.to_link,index])
                self.to_link = undefined;
              }
              else if(self.link_mode == 'Cannot-link'){
                d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
                self.cannot_links.push([self.to_link,index])
                self.to_link = undefined
              }
              self.update();
            }
            

        })
        .on('choose_link',function(event,d){
          if(self.data.indexOf(d) == event.detail){
            d3.select(this).classed('cdr-belink',true)
          }
        })
        .on('unchoose_link',function(event,d){
          if(self.data.indexOf(d) == event.detail){
            d3.select(this).classed('cdr-belink',false)
          }
        })
        .on('unchoose_link_any',function(event,d){
            d3.select(this).classed('cdr-belink',false)
        })

      //绘制连接线
      const mustlink = svg.append('g')
        .classed('cdr-mustlink-g',true)
        .selectAll('*')
        .data(self.must_links)
        .join('line')
        .attr('stroke-width',3)
        .attr('stroke','gray')
        .attr('x1',xScale((d,i)=>self.data[d[0]].x))
        .attr('y1',yScale((d,i)=>self.data[d[0]].y))
        .attr('x2',xScale((d,i)=>self.data[d[1]].x))
        .attr('y2',yScale((d,i)=>self.data[d[1]].y))
      const cannotlink = svg.append('g')
        .classed('cdr-connotlink-g',true)
        .selectAll('*')
        .data(self.cannot_links)
        .join('line')
        .attr('stroke-width',3)
        .attr('stroke','#980000')
        .attr('x1',(d,i)=>xScale(self.data[d[0]].x))
        .attr('y1',(d,i)=>yScale(self.data[d[0]].y))
        .attr('x2',(d,i)=>xScale(self.data[d[1]].x))
        .attr('y2',(d,i)=>yScale(self.data[d[1]].y))


      //绑定zoom
      if(this.zoomFlag){
          function zoomed(e) {
              d3.select('.cdr-scatter-g').attr("transform", e.transform);
              d3.select('.cdr-mustlink-g').attr("transform", e.transform);
              d3.select('.cdr-connotlink-g').attr("transform", e.transform);
          }   
          const zoom = d3.zoom()
              .scaleExtent([0.1, 40])
              .translateExtent([[-10000, -10000], [width + 100000, height + 10000000]])
              // .filter(filter)
              .on("zoom", zoomed);
          svg.call(zoom)
      }

      //绑定lasso
      if(!this.zoomFlag)
        this.setLasso();

      //绘制legend
      this.drawLegend()
    },
    update(newdata=undefined){
      // 只能在draw之后执行
      // 仅更新data的内部信息，然后重绘图，不改变data的长度，不更新raw_range；不重新按照data生成groups中的信息，在视图
      

      let drawData = newdata;
      
      if(drawData === undefined || drawData === null || drawData.length != this.length){
        drawData = this.data;
      }

      if(drawData === undefined || this.drawData === null || drawData.length == 0)
        return ;
      
      let svg = d3.select('.cdr-plot')
      const self = this;
      //清理画布
      svg.selectAll('*').remove();
      let oldSVG = svg.node()
      let newSVG = oldSVG.cloneNode(true);
      oldSVG.parentNode.replaceChild(newSVG,oldSVG)
      svg = d3.select('.cdr-plot')

      //设置/计算大小
      svg.style('width',()=>{
        return d3.select('.cdr-plot-container').node().getBoundingClientRect().width * 0.8
      })
      const width = svg.node().getBoundingClientRect().width;
      const height = svg.node().getBoundingClientRect().height;

      //获取range
      // let range = this.raw_range;
      let range = {
          'x':[Math.min(...drawData.map(v=>v.x)),Math.max(...drawData.map(v=>v.x))],
          'y':[Math.min(...drawData.map(v=>v.y)),Math.max(...drawData.map(v=>v.y))]
        }

      //定义scale
      const xScale = d3.scaleLinear()
        .domain(range.x)
        .range([this.padding,width-this.padding])
      const yScale = d3.scaleLinear()
        .domain(range.y)
        .range([this.padding,height-this.padding])

      //绘图
      const scatter = svg.append('g')
        .classed('cdr-scatter-g',true)
        .selectAll('*')
        .data(drawData)
        .join('circle')
        .classed('cdr-scatter',true)
        .classed('cdr-belink',function(d,i){
          if(self.to_link !== undefined){
            if(self.to_link == i)
              return true;
          }
          for(let x of self.must_links){
            if(x[0] == i)
              return true;
            else if(x[1] == i)
              return true
          }
          for(let x of self.cannot_links){
            if(x[0] == i)
              return true;
            else if(x[1] == i)
              return true
          }
          return false;
        })
        .classed('cdr-chosen',function(d,i){
          if(self.chosenData.find(v=>v==i) !== undefined)
            return true;
          else
            return false;
        })
        .attr("cx",(d)=>xScale(d.x))
        .attr("cy",(d)=>yScale(d.y))
        .attr("r",6)
        .attr("fill",d=>this.groups[d.group].color)
        .attr("fill-opacity",0.6)
        .attr("stroke",d=>this.groups[d.group].color)
        .attr("stroke-width","1px")
        .on('click',function(event,d){
            event.stopPropagation();
            if(self.link_mode == 'No-link')
              return;
            if(self.to_link === undefined){
              let index = self.data.indexOf(d);
              self.to_link = index;
              d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
            }
            else if(self.to_link !== undefined){
              
              let index = self.data.indexOf(d);
              if(index == self.to_link){//点了两个相同的点，就退出
                return;
              }
              if(self.link_mode == 'Must-link'){
                d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
                self.must_links.push([self.to_link,index])
                self.to_link = undefined;
              }
              else if(self.link_mode == 'Cannot-link'){
                d3.selectAll('.cdr-scatter').dispatch('choose_link',{'detail':index})
                self.cannot_links.push([self.to_link,index])
                self.to_link = undefined
              }
              self.update();
            }
            
        })
        .on('choose_link',function(event,d){
          if(self.data.indexOf(d) == event.detail){
            d3.select(this).classed('cdr-belink',true)
          }
        })
        .on('unchoose_link',function(event,d){
          if(self.data.indexOf(d) == event.detail){
            d3.select(this).classed('cdr-belink',false)
          }
        })
        .on('unchoose_link_any',function(event,d){
            d3.select(this).classed('cdr-belink',false)
        })

      //绘制连接线
      const mustlink = svg.append('g')
        .classed('cdr-mustlink-g',true)
        .selectAll('*')
        .data(self.must_links)
        .join('line')
        .attr('stroke-width',3)
        .attr('stroke','#6d9eeb')
        .attr('x1',(d,i)=>xScale(self.data[d[0]].x))
        .attr('y1',(d,i)=>yScale(self.data[d[0]].y))
        .attr('x2',(d,i)=>xScale(self.data[d[1]].x))
        .attr('y2',(d,i)=>yScale(self.data[d[1]].y))
      const cannotlink = svg.append('g')
        .classed('cdr-connotlink-g',true)
        .selectAll('*')
        .data(self.cannot_links)
        .join('line')
        .attr('stroke-width',3)
        .attr('stroke','#980000')
        .attr('x1',(d,i)=>xScale(self.data[d[0]].x))
        .attr('y1',(d,i)=>yScale(self.data[d[0]].y))
        .attr('x2',(d,i)=>xScale(self.data[d[1]].x))
        .attr('y2',(d,i)=>yScale(self.data[d[1]].y))


      //绑定zoom
      if(this.zoomFlag){
          function zoomed(e) {
              d3.select('.cdr-scatter-g').attr("transform", e.transform);
              d3.select('.cdr-mustlink-g').attr("transform", e.transform);
              d3.select('.cdr-connotlink-g').attr("transform", e.transform);
              self.old_transform = e.transform;
              
          }   
          const zoom = d3.zoom()
              .scaleExtent([0.1, 40])
              .translateExtent([[-10000, -10000], [width + 100000, height + 10000000]])
              // .filter(filter)
              .on("zoom", zoomed);


          console.log(self.old_transform)
          if(self.old_transform !== undefined){
            zoom.transform(d3.select('.cdr-scatter-g'),self.old_transform)
            zoom.transform(d3.select('.cdr-mustlink-g'),self.old_transform)
            zoom.transform(d3.select('.cdr-connotlink-g'),self.old_transform)
          }

          
          svg.call(zoom)
      }

      //绑定lasso
      if(!this.zoomFlag){
          this.setLasso();
      }

      //绘制legend
      this.drawLegend()
    },

    exportChosenData(){//返回选择的数据index
      console.log('export:',this.chosenData)
      return this.chosenData;//返回index
    },
    exportCDRUpdateParams(){//返回用于update的links（index形式）

      if(this.must_links.length == 0 && this.cannot_links == 0){
        this.$message.error('请先连线')
        return;
      }

      this.loading = true

      //整理links
      let links = []
      let link_spread = []
      let index = 0;
      for(let l of this.must_links){
        links.push([index,l[0],l[1],0,1])
        link_spread.push(0)
        index++;
      }
      for(let l of this.cannot_links){
        links.push([index,l[0],l[1],1,1])
        link_spread.push(0)
        index++;
      }


      update(links,link_spread,[[0,0]]).then((response)=>{
        
        let embedding = response.data.embeddings;
        for(let i = 0;i < this.data.length;i++){
          this.data[i].x = embedding[i][0];
          this.data[i].x = embedding[i][0];
        }
        this.must_links=[]
        this.cannot_links=[]
        if(this.to_link !== undefined){
          d3.selectAll('.cdr-scatter').dispatch('unchoose_link',{'detail':this.to_link})
          this.to_link = undefined;
        }

        this.update();
        this.loading = false
      }).catch(err=>{
        this.loading = false
      })

    },

    /**
     * 
     * 内部接口
     * 
     * 
     */
    
    
    drawLegend(){//根据group中的数据绘制legend
      
      const svg = d3.select('.cdr-plot-legend')
      const self = this;

      //清空画布
      svg.selectAll('*').remove();

      //处理异常
      if(this.groups === undefined || this.groups === null || Object.keys(this.groups).length == 0)
        return;

      const unitWidth = 60;
      const unitHeight = 40;
      const textSize = 22;
      const height = svg.node().getBoundingClientRect().height;

      //包装this.groups为array

      const legendPlot = svg.append('g')

      const legendUnit = legendPlot.selectAll('*')
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
        // .on('click',function(event,d){
        //     let newChosenData = JSON.parse(JSON.stringify(this.chosenData))
        //     d3.selectAll('.cdr-scatter').each(()=>{
              
        //     })
        // })

      //legend text
      legendUnit.append('text')
        .text(d=>d)
        .attr('font-size',textSize)
        .attr('x',d=>0.5 * unitWidth)
        .attr('y',function(d){
          return 0.5 * unitHeight + 0.4 * textSize;
        })
      
      svg.style('width',legendPlot.node().getBoundingClientRect().width + 20)
    },
    setLasso(){//设置lasso

        let circles = d3.selectAll('.cdr-scatter')
        
        //lasso
        var lasso_start = () => {
            ls.items().classed("cdr-chosen", false).classed("cdr-possible", false);
            // d3.selectAll('.cdr-scatter').classed("cdr-chosen", false).classed("cdr-possible", false);//由于禁用的原因，这里必须这么做
            this.chosenData.length = 0;
        };
        var lasso_draw = () => {
            ls.possibleItems().classed("cdr-chosen", false).classed("cdr-possible", true);
            ls.notPossibleItems().classed("cdr-chosen", false).classed("cdr-possible", false);
        };
        var lasso_end = () => {
            ls.selectedItems().classed("cdr-chosen", true).classed("cdr-possible", false).dispatch("chosen");
            let newChosenData = []
            ls.selectedItems().each((d,i)=>{
              newChosenData.push(this.data.indexOf(d))
            });
            this.chosenData = newChosenData
        };
        var ls = lasso()
            .closePathSelect(true)
            .closePathDistance(100)
            .items(circles)
            .targetArea(d3.select('.cdr-plot'))
            .on("start", lasso_start)
            .on("draw", lasso_draw)
            .on("end", lasso_end);
        ls.closePathDistance(2000);
        d3.select('.cdr-plot').call(ls);
    },
    //标注相关
    enter_anno(){
      //判断特例
      if(this.chosenData.length == 0){
        this.$message.error('请选择数据！')
        return;
      }
      if(this.anno_type === undefined || this.anno_type === null || this.anno_type==''){
        this.$message.error('请输入有效的标注类型！')
        return;
      }

      if(Object.keys(this.groups).find(v=>v==this.anno_type) !== undefined){//已有的类型
        for(let index of this.chosenData){
          this.data[index].group = this.anno_type;
        }
        this.chosenData.length = 0;
        d3.selectAll('.cdr-scatter').classed("cdr-chosen", false).classed("cdr-possible", false);
        this.anno_visible = false;
        this.anno_type = '';
        this.update();
        return;
      }
      else{//新的类型
          //在groups中填入新的类型，并且分配颜色
          this.groups[this.anno_type]={
            'color':d3.interpolateRainbow(Math.random())//TODO撞色的可能
          }
          for(let index of this.chosenData){
            this.data[index].group = this.anno_type;
          }

          this.chosenData.length = 0;
          d3.selectAll('.cdr-scatter').classed("cdr-chosen", false).classed("cdr-possible", false);
          this.anno_visible = false;
          this.anno_type = '';
          this.update();
          return;
      }
      
      

    },
    cancel_anno(){//取消标注
      this.anno_type = '';
      this.anno_visible = false;
    },

    //link相关
    clearLink(){
        d3.selectAll('.cdr-scatter').dispatch('unchoose_link_any')
        this.to_link = undefined;
        this.must_links = []
        this.cannot_links = []
        this.update();
    },


  },
  watch:{
    link_mode(){
      //清除to_link
      if(this.to_link !== undefined){
        d3.selectAll('.cdr-scatter').dispatch('unchoose_link',{'detail':this.to_link})
        this.to_link = undefined;
      }
      
    },
    zoomFlag(){
      if(this.zoomFlag){
        //清除圈选内容
        d3.selectAll('.cdr-scatter').classed("cdr-chosen", false)
        this.chosenData.length = 0
        //启用zoom
        this.update()
      }
      else{
        //禁用zoom

        //启动圈选
        this.update()
      }

    },


    

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
    position: relative;
  }

  .cdr-plot-container{
    width:100%;
    display: flex;
    overflow-x:auto;
    flex:1 1 0;
  }


  .cdr-plot{
    /* flex: 0 0 80%; */
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
    padding-left: 40px;
  }



</style>


<style>
  /* lasso */



  .cdr-belink{
    fill-opacity: 1;
    z-index: 100;
    stroke: #666666;
    stroke-width:3;
  }

  .cdr-chosen,.cdr-possible{
    fill-opacity: 1;
    z-index: 100;
    stroke: black;
    stroke-width:2;
  }

  .lasso path{
  fill-opacity: 0.6;
  stroke: rgb(64, 169, 255);
  stroke-width: 2px;
  }

  .lasso .drawn{
  fill-opacity: 0.05;
  }

  .lasso .loop_close{
  fill: none;
  stroke-dasharray: 4, 4;
  }

  .lasso .origin{
  fill: #3399ff;
  fill-opacity: 0.5;
  }

</style>
