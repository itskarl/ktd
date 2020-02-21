"use strict";

if (window.jQuery) {
  jQuery(function($) {
    function ifMSIE() {
      return (
        window.navigator.userAgent.indexOf("MSIE ") > 0 ||
        window.navigator.userAgent.indexOf("Trident/") > 0
      );
    }

    /**
     * Read and populate data from XML file
     */
    function populateContent() {
      $.get("resources/data/content.xml", function(content) {
        $(content)
          .find("includes item")
          .each(function() {
            var id = $("id", this).text();
            var html = $("html", this).text();
            $('[data-include-html="' + id + '"]')
              .html(html)
              .trigger("contentLoaded");
          });
        $(document).trigger("allContentLoaded");
        $("body").addClass("contentLoaded");
      }).fail(function() {
        console.error("content.xml is not loaded");
      });
    }

    /**
     * Dropdown Menu
     */
    function dropdownMenuInit() {
      $(".menu__item--parent")
        .on("mouseenter touchstart", function() {
          $(this).addClass("hover");
        })
        .on("mouseleave", function() {
          $(this).removeClass("hover");
        });
      $(".menu__item--parent .menu__sub a").on("click", function() {
        $(this)
          .parents(".menu__item--parent")
          .removeClass("hover");
      });
    }

    /**
     * Desktop Navigation / switching sections
     */
    var $sections, $sectionLinks;

    function sectionsInit() {
      $sections = $("section");

      // find all links, which are links to sections
      $sectionLinks = $(
        '.menu a[href^="#"], .logo .desktop-only a[href^="#"]'
      ).filter(function() {
        var id = $(this).attr("href");
        if (id == "#") {
          return false;
        }
        try {
          // id may contain symbols, which raise error
          var $section = $sections.filter(id);
        } catch (err) {
          return false;
        }
        return $section.length > 0;
      });
      $sectionLinks = $sectionLinks.add(".menu a.menu__item__parent-link");

      // binding
      $sectionLinks.on("click", function(e) {
        e.preventDefault();
        var id = $(this).attr("href");
        if (id) {
          sectionShow(id);
        }
      });

      // handling back/forward browser buttons
      $(window).on("popstate", function() {
        if (location.hash) {
          sectionShow(location.hash);
        } else {
          sectionShow(homeSectionId, true);
        }
      });
    }

    // switches section
    function sectionShow(id, doNotPushState) {
      try {
        // id may contain symbols, which raise error
        var $section = $sections.filter(id);
      } catch (err) {
        return false;
      }
      if ($section.length && !$section.hasClass("active")) {
        if (doNotPushState != true) {
          history.pushState(null, null, id);
        }
        $sections.removeClass("active");
        $section.addClass("active").trigger("activated");
        $sectionLinks.removeClass("active");
        var $target = $sectionLinks.filter('[href="' + id + '"]');
        $target.addClass("active");
        $target
          .parents(".menu__item--parent")
          .children(".menu__item__parent-link")
          .addClass("active");
        return true;
      }
      return false;
    }

    /**
     * Sticky ISI
     */
    function stickyISIinit() {
      if (!window.Waypoint || !$.fn.waypoint) {
        console.error("Waypoints library is not loaded.");
        return false;
      }
      var $staticISIWaypoint = $("#static-isi-waypoint");
      var $stickyISI = $(".sticky-isi").addClass("active");
      var $scrollBox = $(".sticky-isi__scroll-box");
      var $expand = $(".sticky-isi__control__expand");
      var $close = $(".sticky-isi__control__close");
      var $mobileToTop = $(".to-top-button");

      var setState = function(show) {
        if (show) {
          $stickyISI.addClass("active");
          $mobileToTop.removeClass("shifted");
        } else {
          $stickyISI.removeClass("active");
          $mobileToTop.addClass("shifted");
        }
      };
      var refreshState = function() {
        var top = $staticISIWaypoint.offset().top;
        var st = $(window).scrollTop();
        setState(top > $(window).height() + st);
      };
      $stickyISI.on("refreshState", refreshState);

      $(document).on("allContentLoaded", function() {
        $staticISIWaypoint.waypoint(
          function(direction) {
            setState(direction == "up");
          },
          {
            offset: "100%"
          }
        );

        // refresh waypoints on image load
        $("img").on("load", function() {
          Waypoint.refreshAll();
          $stickyISI.trigger("refreshState");
        });
      });

      // refresh waypoints on section activation
      $sections.on("activated", function() {
        Waypoint.refreshAll();
      });
      $(".toggle__content").on("opened closed", function() {
        Waypoint.refreshAll();
      });

      $expand.on("click", function(e) {
        e.preventDefault();
        $stickyISI.trigger("open");
      });

      $close.on("click", function(e) {
        e.preventDefault();
        $stickyISI.trigger("close");
      });

      $stickyISI
        .on("open", function() {
          $stickyISI.addClass("expand");

          var bodyWidth = $("body").width();
          $("body").css({ overflow: "hidden", width: bodyWidth + "px" });
          $scrollBox.css({ overflow: "auto" });
          // bug in Chrome, box is not scrollable with mousewheel after slide up animation. Need to reset overflow attribute after animation finished
          setTimeout(function() {
            $scrollBox.css({ overflow: "hidden" })[0].offsetHeight;
            $scrollBox.css({ overflow: "auto" });
          }, 500);
          $("html, body")
            .stop()
            .animate({ scrollTop: 0 }, 400);
        })
        .on("close", function() {
          $stickyISI.removeClass("expand");
          $("body").css({ overflow: "auto", width: "auto" });
          $scrollBox.css({ overflow: "hidden" });
          $scrollBox.stop().animate({ scrollTop: 0 }, 300);
        });
    }

    /**
     *  External link notification
     *
     *  shows popup if user click external link
     *  to display link(external site) title in the popup window add attribute "data-external-link-title" to the link, like this:
     *  <a href="http://site.com" data-external-link-title="Site title to be displayed in the popup">Link to Site</a>
     */

    function externalLinksInit() {
      var $popup = $(".link-popup");
      var $popupYes = $(".link-popup__control--yes", $popup);
      var $popupSiteTitle = $(".link-popup__site-title", $popup);
      var $popupSiteDesc = $(".link-popup__site-desc", $popup);
      var $popupSiteTitleLabel = $(".link-popup__title-to", $popup);
      var $popupSiteDisc = $(".link-popup__site-disc", $popup);
      $(document).on("allContentLoaded", function(e) {
        $("a")
          .filter(function() {
            return this.hostname && this.hostname !== location.hostname;
          })
          .on("click", function(e) {
            e.preventDefault();
            var siteTitle = $(this).data("external-link-title");
            var siteDesc = $(this).data("external-link-desc");
            var siteDisc = $(this).data("external-link-disc");
            if (siteTitle || siteDesc || siteDisc) {
              $popupSiteTitle.text(siteTitle);
              $popupSiteDesc.text(siteDesc);
              $popupSiteTitleLabel.show();
              $popupSiteDisc.text(siteDisc);
            } else {
              $popupSiteTitle.empty();
              $popupSiteDesc.empty();
              $popupSiteTitleLabel.hide();
            }
            $popupYes.attr("href", this.href);
            $popupYes.attr("target", this.target);
            $popup.addClass("active");
          });
      });
      $(".link-popup__control--no, .link-popup__close", $popup).on(
        "click",
        function(e) {
          e.preventDefault();
          $popup.removeClass("active");
        }
      );
      $(".link-popup__control--yes", $popup).on("click", function(e) {
        $popup.removeClass("active");
      });
    }

    /**
        * Animated OS/COMBO chart *
        * tag <div class="animated-chart"></div> in content.xml file will be replaced by actual actual code of animated 
        chart 
        */
    function animatedOSComboChartInit() {
      var $template = $("#os-combo-animated-template");

      $(document).on("allContentLoaded", function(e) {
        $(".os-combo-chart").html($template.html());
        $template.remove();

        $(".achart").each(function() {
          var $chart = $(this);
          $chart.parents("section").on("activated", function() {
            $chart.trigger("restart");
          });
          $chart.parents(".toggle__content").on("open", function() {
            $chart.trigger("restart");
          });
          $(".achart__redraw", $chart).on("click", function() {
            $chart.trigger("restart");
          });
        });
        $(".achart").on("restart", function() {
          var $chart = $(this);
          $chart.removeClass("start")[0].offsetHeight; // offsetHeight makes browser to redraw element
          if (ifMSIE()) {
            $chart.hide(0).show(0);
          }
          setTimeout(function() {
            $chart.addClass("start");
          }, 300);
        });
      });
    }

    /**
        * Animated OS/MONO chart *
        * tag <div class="animated-chart"></div> in content.xml file will be replaced by actual actual code of animated 
        chart 
        */
    function animatedOSMonoChartInit() {
      var $template = $("#os-mono-animated-template");

      $(document).on("allContentLoaded", function(e) {
        $(".os-mono-chart").html($template.html());
        $template.remove();

        $(".achart").each(function() {
          var $chart = $(this);
          $chart.parents("section").on("activated", function() {
            $chart.trigger("restart");
          });
          $chart.parents(".toggle__content").on("open", function() {
            $chart.trigger("restart");
          });
          $(".achart__redraw", $chart).on("click", function() {
            $chart.trigger("restart");
          });
        });
        $(".achart").on("restart", function() {
          var $chart = $(this);
          $chart.removeClass("start")[0].offsetHeight; // offsetHeight makes browser to redraw element
          if (ifMSIE()) {
            $chart.hide(0).show(0);
          }
          setTimeout(function() {
            $chart.addClass("start");
          }, 300);
        });
      });
    }

    /**
        * Animated PFS/MONO chart *
        * tag <div class="animated-chart"></div> in content.xml file will be replaced by actual actual code of animated 
        chart 
        */
    function animatedPFSMonoChartInit() {
      var $template = $("#pfs-mono-animated-template");

      $(document).on("allContentLoaded", function(e) {
        $(".pfs-mono-chart").html($template.html());
        $template.remove();

        $(".achart").each(function() {
          var $chart = $(this);
          $chart.parents("section").on("activated", function() {
            $chart.trigger("restart");
          });
          $chart.parents(".toggle__content").on("open", function() {
            $chart.trigger("restart");
          });
          $(".achart__redraw", $chart).on("click", function() {
            $chart.trigger("restart");
          });
        });
        $(".achart").on("restart", function() {
          var $chart = $(this);
          $chart.removeClass("start")[0].offsetHeight; // offsetHeight makes browser to redraw element
          if (ifMSIE()) {
            $chart.hide(0).show(0);
          }
          setTimeout(function() {
            $chart.addClass("start");
          }, 300);
        });
      });
    }

    /**
        * Animated PFS/COMBO chart *
        * tag <div class="animated-chart"></div> in content.xml file will be replaced by actual actual code of animated 
        chart 
        */
    function animatedPFSComboChartInit() {
      var $template = $("#pfs-combo-animated-template");

      $(document).on("allContentLoaded", function(e) {
        $(".pfs-combo-chart").html($template.html());
        $template.remove();

        $(".achart").each(function() {
          var $chart = $(this);
          $chart.parents("section").on("activated", function() {
            $chart.trigger("restart");
          });
          $chart.parents(".toggle__content").on("open", function() {
            $chart.trigger("restart");
          });
          $(".achart__redraw", $chart).on("click", function() {
            $chart.trigger("restart");
          });
        });
        $(".achart").on("restart", function() {
          var $chart = $(this);
          $chart.removeClass("start")[0].offsetHeight; // offsetHeight makes browser to redraw element
          if (ifMSIE()) {
            $chart.hide(0).show(0);
          }
          setTimeout(function() {
            $chart.addClass("start");
          }, 300);
        });
      });
    }

    /**
     *  External link notification
     *
     *  shows popup if user click external link
     *  to display link(external site) title in the popup window add attribute "data-external-link-title" to the link, like this:
     *  <a href="http://site.com" data-external-link-title="Site title to be displayed in the popup">Link to Site</a>
     */

    function videoPopupInit() {
      $(document).on("allContentLoaded", function(e) {
        var $closeTemplate = $("#video-popup-close-template");
        $(".video-popup")
          .prepend($closeTemplate.html())
          .wrapInner('<div class="video-popup__box">')
          .detach()
          .appendTo("body")
          .on("close", function() {
            var $this = $(this);
            $this.removeClass("active");
            setTimeout(function() {
              // this will reload/stop player
              $this.find("iframe").each(function() {
                this.src = this.src;
              });
            }, 300);
          })
          .on("open", function() {
            $(this).css("display", "block")[0].offsetHeight; //redraw
            var scrollTop = Math.max(
              $("html").scrollTop(),
              $("body").scrollTop()
            );
            $(this)
              .addClass("active")
              .find(".video-popup__box")
              .css("margin-top", scrollTop + 60 + "px");
          })
          .on("click", function(e) {
            if (e.target == this) {
              // click on black overlay, not the content
              $(this).removeClass("active");
            }
          })
          .on("transitionend", function() {
            if (!$(this).hasClass("active")) {
              $(this).css("display", "none");
            }
          });
        $(".video-popup__close-control").on("click", function() {
          $(this)
            .parents(".video-popup")
            .trigger("close");
        });

        $(".video-thumb").on("click", function(e) {
          e.preventDefault();
          var id = $(this).attr("rel");
          if (id) {
            var $popup = $("#" + id);
            if (!$popup.length) {
              return;
            }
          } else {
            return;
          }
          $popup.trigger("open");
        });
      });
    }

    /**
     *  Mobile Sections
     */
    function mobileSectionsInit() {
      $(".toggle__content")
        .on("open", function(e) {
          var $control = $(
            '.toggle__control[rel="' + $(this).attr("id") + '"]'
          );

          // closing other toggles if this toggle is from sub-group
          if ($control.hasClass("toggle__control--group")) {
            var $wrapper = $control.parents(".toggle__controls-group-wrapper");
            $wrapper.find(".toggle__control--group.active").each(function() {
              var $content = $("#" + $(this).attr("rel"));
              $content.trigger("close");
              $(this).removeClass("active");
            });
            $wrapper
              .find(".toggle__controls-group-control")
              .addClass("active-sub");
          }

          $(this)
            .stop(true)
            .slideDown(400, function() {
              $(this).trigger("opened");
            });
          $control.addClass("active");
        })
        .on("close", function(e) {
          if (e.target != this) {
            return;
          }
          var $control = $(
            '.toggle__control[rel="' + $(this).attr("id") + '"]'
          );
          if ($control.hasClass("toggle__control--group")) {
            var $wrapper = $control.parents(".toggle__controls-group-wrapper");
            $wrapper
              .find(".toggle__controls-group-control")
              .removeClass("active-sub");
          }
          $(this)
            .stop(true)
            .slideUp(400, function() {
              $(this).trigger("closed");
            });
          $('.toggle__control[rel="' + $(this).attr("id") + '"]').removeClass(
            "active"
          );
        });

      $(".toggle__control").on("click", function(e) {
        e.preventDefault();
        var $this = $(this);
        var $content = $("#" + $this.attr("rel"));
        if ($this.hasClass("active")) {
          $content.trigger("close");
          if ($this.hasClass("toggle__control--group")) {
            $content.find(".toggle__content").trigger("close");
          }
        } else {
          $content.trigger("open");
        }
      });
    }

    /**
     *  Mobile Menu
     */
    function mobileMenuInit() {
      var $menu = $(".m-menu");
      var $control = $(".m-menu-control");
      $control.on("click", function() {
        if ($(this).hasClass("active")) {
          $menu.trigger("close");
        } else {
          $menu.trigger("open");
        }
      });
      $menu
        .on("open", function() {
          $(this).addClass("active");
          $control.addClass("active");
        })
        .on("close", function() {
          $(this).removeClass("active");
          $("a.active", this).removeClass("active");
          $("ul ul", this).slideUp(300);
          $control.removeClass("active");
        });

      $('a[href^="#"]', $menu)
        .add('.logo .mobile-only a[href^="#"]')
        .on("click", function(e) {
          e.preventDefault();
          var $target = $($(this).attr("href"));
          if (!$target.length) {
            return false;
          }
          // closing menu
          $menu.trigger("close");
          // expanding toggle if this section has collapsed toggle
          $(".toggle__content", $target).trigger("open");
          // scrolling to the section
          var $scrollTo = $(this).data("scroll-to")
            ? $($(this).data("scroll-to"))
            : $target;
          var offset = $scrollTo.offset();
          $("html, body")
            .stop()
            .animate({ scrollTop: offset.top - 60 }, 600);
        });

      $("ul ul", $menu).each(function() {
        $(this)
          .parent()
          .children("a")
          .on("click", function() {
            var $this = $(this);
            var $group = $this.next("ul");
            if ($this.hasClass("active")) {
              $this.removeClass("active");
              $group.stop(true).slideUp(300);
            } else {
              $this.addClass("active");
              $group.stop(true).slideDown(300);
            }
          });
      });
    }

    /**
     *  To Top
     */
    function toTopInit() {
      var $button = $(".to-top-button");

      $button.on("click", function(e) {
        e.preventDefault();
        $("html, body")
          .stop()
          .animate({ scrollTop: 0 }, 600);
      });

      var update = function() {
        var st = $(window).scrollTop();
        if (st > 10) {
          $button.removeClass("hide");
        } else {
          $button.addClass("hide");
        }
      };
      $(window).on("scroll.topTop", update);
      update();
    }

    /**
     *  Google Tracking
     *
     *  tracks section activation or expanding toggle
     *  if section or toggle has attribute "data-ga-path" - value will be used as a 'page_path', otherwise ID of the section/toggle will be send
     */

    var GA_TRACKING_ID;
    function getGtagUID() {
      let $script = $(
        'script[src^="https://www.googletagmanager.com/gtag/js?id="]'
      );
      if ($script.length) {
        var src = $script.attr("src");
        var m = src.match(/id=(.+?)(&.*)?$/);
        if (m) {
          return m[1];
        }
      }
      return false;
    }

    function googleTrackingInit() {
      if (typeof gtag != "function") {
        return;
      }
      if (!GA_TRACKING_ID) {
        GA_TRACKING_ID = getGtagUID();
        if (!GA_TRACKING_ID) {
          return;
        }
      }
      // desktop sections
      $("section").on("activated", function() {
        var page_path = $(this).data("ga-path")
          ? $(this).data("ga-path")
          : "/" + this.id;
        gtag("config", GA_TRACKING_ID, { page_path: page_path });
      });
      // mobile toggles
      $(".toggle__content:not([data-ga-notrack])").on("open", function() {
        var page_path = $(this).data("ga-path")
          ? $(this).data("ga-path")
          : "/" + this.id;
        gtag("config", GA_TRACKING_ID, { page_path: page_path });
      });
      // mobile summary section (which has no toggle)
      $('a[href="#home"]').on("click", function() {
        var $obj = $("#home");
        var page_path = $obj.data("ga-path")
          ? $obj.data("ga-path")
          : "/" + $obj.attr("id");
        gtag("config", GA_TRACKING_ID, { page_path: page_path });
      });
      // external links
      $(".link-popup__control--yes").on("click", function() {
        var page_path = this.href;
        gtag("config", GA_TRACKING_ID, { page_path: "/exit/#" + page_path });
      });
    }

    /**
     * Start
     */
    var homeSectionId =
      "#" +
      $("section")
        .first()
        .attr("id");
    $(document).on("allContentLoaded", function() {
      if (!(location.hash && sectionShow(location.hash, true))) {
        sectionShow(homeSectionId, true);
      }
    });

    dropdownMenuInit();
    sectionsInit();
    stickyISIinit();
    externalLinksInit();
    // animatedChartInit();
    animatedPFSMonoChartInit();
    animatedPFSComboChartInit();
    animatedOSMonoChartInit();
    animatedOSComboChartInit();
    videoPopupInit();
    mobileSectionsInit();
    mobileMenuInit();
    toTopInit();
    googleTrackingInit();
    populateContent();
  });
} else {
  console.error("jQuery is not loaded.");
}
