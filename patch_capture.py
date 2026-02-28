import sys

with open('public/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old function start (from the comment block)
comment = "/**\n * 현재 활성화된 탭 전체 캡처 (스크롤 영역 포함)\n */\nasync function captureActiveTab()"
start_idx = content.find(comment)

if start_idx == -1:
    # No comment, try just the function
    start_idx = content.find("async function captureActiveTab()")
    if start_idx == -1:
        print("ERROR: captureActiveTab not found")
        sys.exit(1)
    
print("Found at:", start_idx)

# New capture implementation
NEW = r"""/**
 * 캡처 대상 탭 개별 캡처
 */
async function captureTargetTab(targetContent, tabName) {
    if (!targetContent) return;
    tabName = tabName || 'Capture';

    var target = targetContent.querySelector('.container') ||
                 targetContent.querySelector('.overseas-container') ||
                 targetContent;

    var scrollTargets = target.querySelectorAll(
        '.overseas-content-scroll, .table-wrapper, .table-wrapper tbody, ' +
        '.grid-container, .adr-chart-container, #quillEditor, .chart-grid'
    );
    var scrollableElements = [];

    scrollTargets.forEach(function(el) {
        scrollableElements.push({
            element: el,
            originalStyles: {
                height: el.style.height,
                maxHeight: el.style.maxHeight,
                overflow: el.style.overflow,
                overflowY: el.style.overflowY
            }
        });
        el.style.height = 'auto';
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
        el.style.overflowY = 'visible';
    });

    var gridEl = targetContent.querySelector('.grid-container');
    if (gridEl) gridEl.style.height = 'auto';

    try {
        await new Promise(function(resolve) { setTimeout(resolve, 200); });

        var canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowHeight: target.scrollHeight + 100
        });

        var image = canvas.toDataURL('image/png');
        var link = document.createElement('a');
        var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.href = image;
        link.download = tabName + '_' + timestamp + '.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('OK capture: ' + tabName);

    } catch (err) {
        console.error('FAIL capture:', err);
        alert('캡처 실패 (' + tabName + '): ' + err.message);
    } finally {
        scrollableElements.forEach(function(item) {
            item.element.style.height = item.originalStyles.height;
            item.element.style.maxHeight = item.originalStyles.maxHeight;
            item.element.style.overflow = item.originalStyles.overflow;
            item.element.style.overflowY = item.originalStyles.overflowY;
        });
        if (gridEl) gridEl.style.height = '';
    }
}

async function captureAllTabs() {
    var origBtn = document.querySelector('.tab-btn.active');
    var allBtns = Array.from(document.querySelectorAll('.tab-btn:not(.add-tab-btn)'));
    if (!allBtns.length) return;
    try {
        for (var i = 0; i < allBtns.length; i++) {
            var btn = allBtns[i];
            activateTab(btn.dataset.tab);
            await new Promise(function(r){ setTimeout(r, 1000); });
            var el = document.getElementById(btn.dataset.tab);
            if (el) await captureTargetTab(el, btn.textContent.trim());
            await new Promise(function(r){ setTimeout(r, 300); });
        }
    } catch(e) {
        alert('전체 캡처 중 오류: ' + e.message);
    } finally {
        if (origBtn) activateTab(origBtn.dataset.tab);
        alert('전체 탭 캡처 완료');
    }
}

window.captureTargetTab = captureTargetTab;
window.captureAllTabs = captureAllTabs;

// captureAllBtn 이벤트 연결
(function() {
    function attachCapture() {
        var el = document.getElementById('captureAllBtn');
        if (el && !el._cl) { el.addEventListener('click', captureAllTabs); el._cl = true; }
    }
    attachCapture();
    document.addEventListener('DOMContentLoaded', attachCapture);
})();

// 개별 탭 캡처 버튼 위임 이벤트
document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.capture-btn-small');
    if (!btn) return;
    var tc = btn.closest('.tab-content');
    if (!tc) return;
    var tb = document.querySelector('.tab-btn[data-tab="' + tc.id + '"]');
    captureTargetTab(tc, tb ? tb.textContent.trim() : 'Capture');
});
"""

patched = content[:start_idx] + NEW

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(patched)

print("SUCCESS: Replaced captureActiveTab with new functions.")
print("New file length:", len(patched))
