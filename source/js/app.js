document.addEventListener("DOMContentLoaded", function () {
  VolantisApp.init();
  VolantisApp.subscribe();
  volantisFancyBox.loadFancyBox();

  volantis.pjax.push(() => {
    VolantisApp.pjaxReload();
    sessionStorage.setItem("domTitle", document.title);
    highlightKeyWords.startFromURL()
  }, 'app.js');
  volantis.pjax.send(() => {
    volantis.dom.switcher.removeClass('active'); // 关闭移动端激活的搜索框
    volantis.dom.header.removeClass('z_search-open'); // 关闭移动端激活的搜索框
    volantis.dom.wrapper.removeClass('sub'); // 跳转页面时关闭二级导航
    volantis.EventListener.remove() // 移除事件监听器 see: layout/_partial/scripts/global.ejs
  }, 'app.js');
  volantis.pjax.push(volantisFancyBox.pjaxReload);
  volantis.pjax.send(() => { // 此处依赖JQ
    if (typeof $ == "undefined") return
    if (typeof $.fancybox != "undefined") {
      $.fancybox.close(); // 关闭弹窗
    }
  }, 'fancybox');

  locationHash();
  highlightKeyWords.startFromURL();
});

/*锚点定位*/
const locationHash = () => {
  if (window.location.hash) {
    let locationID = decodeURI(window.location.hash.split('#')[1]).replace(/\ /g, '-');
    let target = document.getElementById(locationID);
    if (target) {
      setTimeout(() => {
        if (window.location.hash.startsWith('#fn')) { // hexo-reference https://github.com/volantis-x/hexo-theme-volantis/issues/647
          window.scrollTo({
            top: target.offsetTop + volantis.dom.bodyAnchor.offsetTop - volantis.dom.header.offsetHeight,
            behavior: "smooth" //平滑滚动
          });
        } else {
          window.scrollTo({
            top: target.offsetTop + volantis.dom.bodyAnchor.offsetTop + 5,
            behavior: "smooth" //平滑滚动
          });
        }
      }, 1000)
    }
  }
}

// 函数防抖 (只执行最后一次点击)
const Debounce = (fn, t) => {
  const delay = t || 50;
  let timer;
  return function () {
    const args = arguments;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      },
      delay);
  };
};

const VolantisApp = (() => {
  const fn = {},
    COPYHTML = '<button class="btn-copy" data-clipboard-snippet=""><i class="fas fa-copy"></i><span>COPY</span></button>';;
  let scrollCorrection = 80;

  fn.init = () => {
    if (volantis.dom.header) {
      scrollCorrection = volantis.dom.header.clientHeight + 16;
    }

    window.onresize = () => {
      if (document.documentElement.clientWidth < 500) {
        volantis.isMobile = 1;
      } else {
        volantis.isMobile = 0;
      }
      if (volantis.isMobile != volantis.isMobileOld) {
        fn.setGlobalHeaderMenuEvent();
        fn.setHeader();
        fn.setHeaderSearch();
      }
    }
  }

  fn.event = () => {
    volantis.dom.$(document.getElementById("scroll-down")).on('click', function () {
      fn.scrolltoElement(volantis.dom.bodyAnchor);
    });
  }

  fn.restData = () => {
    scrollCorrection = volantis.dom.header ? volantis.dom.header.clientHeight + 16 : 80;
  }

  fn.setIsMobile = () => {
    if (document.documentElement.clientWidth < 500) {
      volantis.isMobile = 1;
      volantis.isMobileOld = 1;
    } else {
      volantis.isMobile = 0;
      volantis.isMobileOld = 0;
    }
  }

  // 校正页面定位（被导航栏挡住的区域）
  fn.scrolltoElement = (elem, correction = scrollCorrection) => {
    window.scrollTo({
      top: elem.offsetTop - correction,
      behavior: 'smooth'
    });
  }

  // 滚动条距离顶部的距离
  fn.getScrollTop = () => {
    let scrollPos;
    if (window.pageYOffset) {
      scrollPos = window.pageYOffset;
    } else if (document.compatMode && document.compatMode != 'BackCompat') {
      scrollPos = document.documentElement.scrollTop;
    } else if (document.body) {
      scrollPos = document.body.scrollTop;
    }
    return scrollPos;
  }

  // 设置滚动锚点
  fn.setScrollAnchor = () => {
    // click topBtn 滚动至bodyAnchor 【移动端 PC】
    if (volantis.dom.topBtn && volantis.dom.bodyAnchor) {
      volantis.dom.topBtn.click(e => {
        e.preventDefault();
        e.stopPropagation();
        fn.scrolltoElement(volantis.dom.bodyAnchor);
        e.stopImmediatePropagation();
      });
    }

    // 滚动监听 显示/隐藏 Header导航 topBtn 【移动端 PC】
    let pos = document.body.scrollTop;
    volantis.dom.$(document).scroll(Debounce(() => {
      const showHeaderPoint = volantis.dom.bodyAnchor.offsetTop - scrollCorrection;
      const scrollTop = fn.getScrollTop(); // 滚动条距离顶部的距离
      const del = scrollTop - pos;
      pos = scrollTop;
      // topBtn
      if (scrollTop > volantis.dom.bodyAnchor.offsetTop) {
        volantis.dom.topBtn.addClass('show');
        // 向上滚动高亮 topBtn
        if (del > 0) {
          volantis.dom.topBtn.removeClass('hl');
        } else {
          volantis.dom.topBtn.addClass('hl');
        }
      } else {
        volantis.dom.topBtn.removeClass('show').removeClass('hl');
      }
      // Header导航
      if (scrollTop - showHeaderPoint > -1) {
        volantis.dom.header.addClass('show');
      } else {
        volantis.dom.header.removeClass('show');
      }
    }));
  }

  // 设置导航栏
  fn.setHeader = () => {
    // !!! 此处的Dom对象需要重载 !!!
    if (!pdata.ispage) return;

    // 填充二级导航文章标题 【移动端 PC】
    volantis.dom.wrapper.find('.nav-sub .title').html(pdata.postTitle);

    // 决定一二级导航栏的切换 【向上滚动50px切换为一级导航栏；向下滚动50px切换为二级导航栏】  【移动端 PC】
    let pos = document.body.scrollTop;
    volantis.dom.$(document).scroll(Debounce(() => {
      const scrollTop = fn.getScrollTop();
      const del = scrollTop - pos;
      if (del >= 50 && scrollTop > 100) { // 向下滚动50px
        pos = scrollTop;
        volantis.dom.wrapper.addClass('sub'); // <---- 二级导航显示
      } else if (del <= -50) { // 向上滚动50px
        pos = scrollTop;
        volantis.dom.wrapper.removeClass('sub'); // <---- 取消二级导航显示 一级导航显示
      }
    }));

    // ====== bind events to every btn =========
    // 评论按钮 【移动端 PC】
    volantis.dom.comment = volantis.dom.$(document.getElementById("s-comment")); // 评论按钮  桌面端 移动端
    volantis.dom.commentTarget = volantis.dom.$(document.querySelector('#l_main article#comments')); // 评论区域
    if (volantis.dom.commentTarget) {
      volantis.dom.comment.click(e => { // 评论按钮点击后 跳转到评论区域
        e.preventDefault();
        e.stopPropagation();
        fn.scrolltoElement(volantis.dom.commentTarget);
        e.stopImmediatePropagation();
      });
    } else volantis.dom.comment.remove(); // 关闭了评论，则隐藏评论按钮

    // 移动端toc目录按钮 【移动端】
    if (volantis.isMobile) {
      volantis.dom.toc = volantis.dom.$(document.getElementById("s-toc")); // 目录按钮  仅移动端
      volantis.dom.tocTarget = volantis.dom.$(document.querySelector('#l_side .toc-wrapper')); // 侧边栏的目录列表
      if (volantis.dom.tocTarget) {
        // 点击移动端目录按钮 激活目录按钮 显示侧边栏的目录列表
        volantis.dom.toc.click((e) => {
          e.stopPropagation();
          volantis.dom.tocTarget.toggleClass('active');
          volantis.dom.toc.toggleClass('active');
        });
        // 点击空白 隐藏
        volantis.dom.$(document).click(function (e) {
          e.stopPropagation();
          volantis.dom.tocTarget.removeClass('active');
          volantis.dom.toc.removeClass('active');
        });
        // 页面滚动  隐藏
        volantis.dom.$(document).scroll(Debounce(() => {
            volantis.dom.tocTarget.removeClass('active');
            volantis.dom.toc.removeClass('active');
          },
          100));
      } else volantis.dom.toc.remove(); // 隐藏toc目录按钮
    }
  }

  // 设置导航栏菜单选中状态  【移动端 PC】
  fn.setHeaderMenuSelection = () => {
    // !!! 此处的Dom对象需要重载 !!!
    volantis.dom.headerMenu = volantis.dom.$(document.querySelectorAll('#l_header .navigation,#l_cover .navigation,#l_side .navigation')); // 导航列表

    // 先把已经激活的取消激活
    volantis.dom.headerMenu.forEach(element => {
      let li = volantis.dom.$(element).find('li a.active')
      if (li)
        li.removeClass('active')
      let div = volantis.dom.$(element).find('div a.active')
      if (div)
        div.removeClass('active')
    });

    // replace '%' '/' '.'
    var idname = location.pathname.replace(/\/|%|\./g, '');
    if (idname.length == 0) {
      idname = 'home';
    }
    var page = idname.match(/page\d{0,}$/g);
    if (page) {
      page = page[0];
      idname = idname.split(page)[0];
    }
    var index = idname.match(/index.html/);
    if (index) {
      index = index[0];
      idname = idname.split(index)[0];
    }
    // 转义字符如 [, ], ~, #, @
    idname = idname.replace(/(\[|\]|~|#|@)/g, '\\$1');
    if (idname && volantis.dom.headerMenu) {
      volantis.dom.headerMenu.forEach(element => {
        if (!/^\d/.test(idname)) { // id 不能数字开头
          let id = element.querySelector("#" + idname)
          if (id) {
            volantis.dom.$(id).addClass('active')
          }
        }
      });
    }
  }

  // 设置全局事件
  fn.setGlobalHeaderMenuEvent = () => {
    if (volantis.isMobile) {
      // 【移动端】 关闭已经展开的子菜单 点击展开子菜单
      document.querySelectorAll('#l_header .m-phone li').forEach(function (e) {
        if (e.querySelector(".list-v")) {
          // 点击菜单
          volantis.dom.$(e).click(function (e) {
            e.stopPropagation();
            // 关闭已经展开的子菜单
            e.currentTarget.parentElement.childNodes.forEach(function (e) {
              if (Object.prototype.toString.call(e) == '[object HTMLLIElement]') {
                e.childNodes.forEach(function (e) {
                  if (Object.prototype.toString.call(e) == '[object HTMLUListElement]') {
                    volantis.dom.$(e).hide()
                  }
                })
              }
            })
            // 点击展开子菜单
            let array = e.currentTarget.children
            for (let index = 0; index < array.length; index++) {
              const element = array[index];
              volantis.dom.$(element).show()
            }
          }, 0);
        }
      })
    } else {
      // 【PC端】 hover时展开子菜单，点击时[target.baseURI==origin时]隐藏子菜单? 现有逻辑大部分情况不隐藏子菜单
      document.querySelectorAll('#wrapper .m-pc li > a[href]').forEach(function (e) {
        volantis.dom.$(e.parentElement).click(function (e) {
          e.stopPropagation();
          if (e.target.origin == e.target.baseURI) {
            document.querySelectorAll('#wrapper .m-pc .list-v').forEach(function (e) {
              volantis.dom.$(e).hide(); // 大概率不会执行
            })
          }
        }, 0);
      })
    }
    fn.setPageHeaderMenuEvent();
  }

  // 【移动端】隐藏子菜单
  fn.setPageHeaderMenuEvent = () => {
    if (!volantis.isMobile) return
    // 【移动端】 点击空白处隐藏子菜单
    volantis.dom.$(document).click(function (e) {
      volantis.dom.mPhoneList.forEach(function (e) {
        volantis.dom.$(e).hide();
      })
    });
    // 【移动端】 滚动时隐藏子菜单
    volantis.dom.$(document).scroll(Debounce(() => {
      volantis.dom.mPhoneList.forEach(function (e) {
        volantis.dom.$(e).hide();
      })
    }));
  }

  // 设置导航栏搜索框 【移动端】
  fn.setHeaderSearch = () => {
    if (!volantis.isMobile) return;
    if (!volantis.dom.switcher) return;
    // 点击移动端搜索按钮
    volantis.dom.switcher.click(function (e) {
      e.stopPropagation();
      volantis.dom.header.toggleClass('z_search-open'); // 激活移动端搜索框
      volantis.dom.switcher.toggleClass('active'); // 移动端搜索按钮
    });
    // 点击空白取消激活
    volantis.dom.$(document).click(function (e) {
      volantis.dom.header.removeClass('z_search-open');
      volantis.dom.switcher.removeClass('active');
    });
    // 移动端点击搜索框 停止事件传播
    volantis.dom.search.click(function (e) {
      e.stopPropagation();
    });
  }

  // 设置 tabs 标签  【移动端 PC】
  fn.setTabs = () => {
    let tabs = document.querySelectorAll('#l_main .tabs .nav-tabs')
    if (!tabs) return
    tabs.forEach(function (e) {
      e.querySelectorAll('a').forEach(function (e) {
        volantis.dom.$(e).on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const $tab = volantis.dom.$(e.target.parentElement.parentElement.parentElement);
          $tab.find('.nav-tabs .active').removeClass('active');
          volantis.dom.$(e.target.parentElement).addClass('active');
          $tab.find('.tab-content .active').removeClass('active');
          $tab.find(e.target.className).addClass('active');
          return false;
        });
      })
    })
  }

  // hexo-reference 页脚跳转 https://github.com/volantis-x/hexo-theme-volantis/issues/647
  fn.footnotes = () => {
    let ref = document.querySelectorAll('#l_main .footnote-backref, #l_main .footnote-ref > a');
    ref.forEach(function (e, i) {
      ref[i].click = () => {}; // 强制清空原 click 事件
      volantis.dom.$(e).on('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        let targetID = decodeURI(e.target.hash.split('#')[1]).replace(/\ /g, '-');
        let target = document.getElementById(targetID);
        if (target) {
          window.scrollTo({
            top: target.offsetTop + volantis.dom.bodyAnchor.offsetTop - volantis.dom.header.offsetHeight,
            behavior: "smooth" //平滑滚动
          });
        }
      });
    })
  }

  // 代码块复制
  fn.copyCode = () => {
    if (!(document.querySelector(".highlight .code pre") ||
        document.querySelector(".article pre code"))) {
      return;
    }

    document.querySelectorAll(".highlight .code pre, .article pre code").forEach(node => {
      const test = node.insertAdjacentHTML("beforebegin", COPYHTML);
      const _BtnCopy = node.previousSibling;
      _BtnCopy.onclick = e => {
        e.stopPropagation();
        const _icon = _BtnCopy.querySelector('i');
        const _span = _BtnCopy.querySelector('span');

        node.focus();
        const range = new Range();
        range.selectNodeContents(node);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);

        const str = document.getSelection().toString();
        fn.writeClipText(str).then(() => {
          volantis.message('复制成功', str.length > 120 ? str.substring(0, 120) + '...' : str, {
            icon: 'fa fa-copy PETERRIVE'
          });
          _BtnCopy.classList.add('copied');
          _icon.classList.remove('fa-copy');
          _icon.classList.add('fa-check-circle');
          _span.innerText = "COPIED";
          setTimeout(() => {
            _icon.classList.remove('fa-check-circle');
            _icon.classList.add('fa-copy');
            _span.innerText = "COPY";
          }, 2000)
        }).catch(e => {
          volantis.message('系统提示', e, {
            icon: 'fa fa-exclamation-circle red'
          });
          _BtnCopy.classList.add('copied-failed');
          _icon.classList.remove('fa-copy');
          _icon.classList.add('fa-exclamation-circle');
          _span.innerText = "COPY FAILED";
          setTimeout(() => {
            _icon.classList.remove('fa-exclamation-circle');
            _icon.classList.add('fa-copy');
            _span.innerText = "COPY";
          })
        })
      }
    });
  }

  // 工具类：复制字符串到剪切板
  fn.writeClipText = (str) => {
    try {
      return navigator.clipboard
        .writeText(str)
        .then(() => {
          return Promise.resolve()
        })
        .catch(err => {
          return Promise.reject(err || '复制文本失败!')
        })
    } catch (e) {
      const input = document.createElement('input');
      input.setAttribute('readonly', 'readonly');
      document.body.appendChild(input);
      input.setAttribute('value', str);
      input.select();
      try {
        let result = document.execCommand('copy')
        document.body.removeChild(input);
        if (!result || result === 'unsuccessful') {
          return Promise.reject('复制文本失败!')
        } else {
          return Promise.resolve()
        }
      } catch (e) {
        document.body.removeChild(input);
        return Promise.reject(
          '当前浏览器不支持复制功能，请检查更新或更换其他浏览器操作!'
        )
      }
    }
  }

  return {
    init: () => {
      fn.init();
      fn.event();
    },
    subscribe: () => {
      fn.setIsMobile();
      fn.setHeader();
      fn.setHeaderMenuSelection();
      fn.setGlobalHeaderMenuEvent();
      fn.setHeaderSearch();
      fn.setScrollAnchor();
      fn.setTabs();
      fn.footnotes();
      fn.copyCode();
    },
    pjaxReload: () => {
      fn.event();
      fn.restData();
      fn.setHeader();
      fn.setHeaderMenuSelection();
      fn.setPageHeaderMenuEvent();
      fn.setScrollAnchor();
      fn.setTabs();
      fn.footnotes();
      fn.copyCode();

      // 移除小尾巴的移除
      document.querySelector("#l_header .nav-main").querySelectorAll('.list-v:not(.menu-phone)').forEach(function (e) {
        e.removeAttribute("style")
      })
      document.querySelector("#l_header .menu-phone.list-v").removeAttribute("style")
      // 处理点击事件 setHeaderSearch 没有重载，需要重新绑定单个事件  【移动端】
      if (volantis.dom.switcher) {
        volantis.dom.$(document).click(function (e) {
          volantis.dom.header.removeClass('z_search-open');
          volantis.dom.switcher.removeClass('active');
        });
      }
    },
    writeClipText: fn.writeClipText
  }
})()
Object.freeze(VolantisApp);

const volantisFancyBox = (() => {
  const fn = {};

  fn.initFB = () => {
    const group = new Set();
    group.add('default'); // 默认类
    group.add('Twikoo'); // TwiKoo 类

    if (!document.querySelector(".md .gallery img, .fancybox")) return;
    document.querySelectorAll(".md .gallery").forEach(function (ele) {
      if (ele.querySelector("img")) {
        group.add(ele.getAttribute('data-group') || 'default');
      }
    })

    Fancybox.destroy();
    for (const iterator of group) {
      if (!!iterator) Fancybox.bind('[data-fancybox="' + iterator + '"]', {
        Hash: false
      });
    }
  }

  fn.loadFancyBox = (done) => {
    if (!document.querySelector(".md .gallery img, .fancybox")) return;
    volantis.css(" https://cdn.jsdelivr.net/npm/@fancyapps/ui/dist/fancybox.css");
    volantis.js('https://cdn.jsdelivr.net/npm/@fancyapps/ui/dist/fancybox.umd.js').then(() => {
      fn.initFB();
      if (done) done();
    })
  }

  return {
    loadFancyBox: (done = null) => {
      fn.loadFancyBox(done);
    },
    initFancyBox: () => {
      fn.initFB()
    },
    pjaxReload: () => {
      if (typeof Fancybox === "undefined") {
        fn.loadFancyBox();
      } else {
        fn.initFB();
      }
    }
  }
})()
Object.freeze(volantisFancyBox);

// highlightKeyWords 与 搜索功能搭配 https://github.com/next-theme/hexo-theme-next/blob/eb194a7258058302baf59f02d4b80b6655338b01/source/js/third-party/search/local-search.js
const highlightKeyWords = (() => {
  let fn = {}
  fn.firstFlag = 1
  fn.startFromURL = () => {
    const params = decodeURI(new URL(location.href).searchParams.get('keyword'));
    const keywords = params ? params.split(' ') : [];
    const post = document.querySelector('#l_main');
    fn.start(keywords, post)
    fn.scrollToFirstHighlightKeywordMark()
  }
  fn.scrollToFirstHighlightKeywordMark = () => {
    let target = document.getElementById("first-highlight-keyword-mark");
    if (target) {
      setTimeout(() => {
        window.scrollTo({
          top: target.getBoundingClientRect().top + document.documentElement.scrollTop - volantis.dom.header.offsetHeight - 5,
        });
      }, 1000)
    }
  }
  fn.start = (keywords, querySelector) => {
    fn.firstFlag = 1
    if (!keywords.length || !querySelector || keywords[0] == "null") return;
    console.log(keywords);
    const walk = document.createTreeWalker(querySelector, NodeFilter.SHOW_TEXT, null);
    const allNodes = [];
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea')) allNodes.push(walk.currentNode);
    }
    allNodes.forEach(node => {
      const [indexOfNode] = fn.getIndexByWord(keywords, node.nodeValue);
      if (!indexOfNode.length) return;
      const slice = fn.mergeIntoSlice(0, node.nodeValue.length, indexOfNode);
      fn.highlightText(node, slice, 'keyword');
      fn.highlightStyle()
    });
  }
  fn.getIndexByWord = (words, text, caseSensitive = false) => {
    const index = [];
    const included = new Set();
    words.forEach(word => {
      const div = document.createElement('div');
      div.innerText = word;
      word = div.innerHTML;
  
      const wordLen = word.length;
      if (wordLen === 0) return;
      let startPosition = 0;
      let position = -1;
      if (!caseSensitive) {
        text = text.toLowerCase();
        word = word.toLowerCase();
      }
      while ((position = text.indexOf(word, startPosition)) > -1) {
        index.push({ position, word });
        included.add(word);
        startPosition = position + wordLen;
      }
    });
    index.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }
      return right.word.length - left.word.length;
    });
    return [index, included];
  };
  fn.mergeIntoSlice = (start, end, index) => {
    let item = index[0];
    let { position, word } = item;
    const hits = [];
    const count = new Set();
    while (position + word.length <= end && index.length !== 0) {
      count.add(word);
      hits.push({
        position,
        length: word.length
      });
      const wordEnd = position + word.length;
  
      index.shift();
      while (index.length !== 0) {
        item = index[0];
        position = item.position;
        word = item.word;
        if (wordEnd > position) {
          index.shift();
        } else {
          break;
        }
      }
    }
    return {
      hits,
      start,
      end,
      count: count.size
    };
  };
  fn.highlightText = (node, slice, className) => {
    const val = node.nodeValue;
    let index = slice.start;
    const children = [];
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position));
      index = position + length;
      let mark = document.createElement('mark');
      mark.className = className;
      mark = fn.highlightStyle(mark)
      mark.appendChild(document.createTextNode(val.substr(position, length)));
      children.push(text, mark);
    }
    node.nodeValue = val.substring(index, slice.end);
    children.forEach(element => {
      node.parentNode.insertBefore(element, node);
    });
  }
  fn.highlightStyle = (mark) => {
    if(!mark) return;
    if (fn.firstFlag) {
      mark.id = "first-highlight-keyword-mark"
      fn.firstFlag = 0;
    }
    mark.style.background = "transparent";
    mark.style["border-bottom"] = "1px dashed #ff2a2a";
    mark.style["color"] = "#ff2a2a";
    mark.style["font-weight"] = "bold";
    return mark
  }
  return {
    start: (keywords, querySelector) => {
      fn.start(keywords, querySelector)
    },
    startFromURL: () => {
      setTimeout(fn.startFromURL, 1000)
    },
    scrollToFirstHighlightKeywordMark: () => {
      fn.scrollToFirstHighlightKeywordMark()
    },
  }
})()
Object.freeze(highlightKeyWords);