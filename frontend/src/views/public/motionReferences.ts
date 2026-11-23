type MotionRow = readonly [time: string, zh: string, en: string, path: string, actionZh: string, actionEn: string]

const useCases = '/home#use-cases'
const steps = '/home#quick-start'
const preview = '/home#motion-preview'
const connect = '/home#connection'
const plans = '/purchase'

export const motionReferences: ReadonlyArray<{ zh: string; en: string; rows: readonly MotionRow[] }> = [
  { zh: '指针与滚动', en: 'Pointer & scroll', rows: [
    ['00:30', '指针聚光', 'Spotlight', useCases, '把鼠标移到场景卡两端，局部柔光跟随指针。', 'Move across a use-case card; the light follows the pointer.'],
    ['00:45', '滚动显现', 'Scroll reveal', useCases, '从上一节向下滚动，首次进入视口的内容轻移上来。', 'Scroll down from the preceding section to see the first entrance.'],
    ['01:00', '边缘流光', 'Border beam', plans, '登录后，在可选套餐上悬停或聚焦按钮；亮线沿卡边走一圈。', 'Sign in and hover an available plan or focus its button to trace the rim.'],
    ['01:15', '磁吸按钮', 'Magnetic button', '/home#home-main', '划过首页主按钮；只动文字和箭头，点击区不动。', 'Cross the main button. Its label and arrow move, not the hit area.'],
    ['01:35', '滚动叙事', 'Scrollytelling', steps, '在宽屏向下滚动四个步骤，左侧示意随当前步骤更新。', 'On a wide screen, scroll through the four steps beside the sticky readout.'],
    ['01:50', '卡片轻倾斜', '3D tilt', useCases, '从左到右划过场景卡，观察表面角度，不移动正文布局。', 'Move left to right across a use-case card to tilt its surface.'],
    ['02:05', '字符解码', 'Text scramble', steps, '在宽屏切换阅读步骤，示意中的短标签先解码；真实密钥不参与。', 'Change steps on a wide screen. Only the decorative label decodes.'],
    ['02:25', '加载扫光', 'Shimmer', preview, '点播放，看一道高光扫过骨架；暂停可停住高光。', 'Play the sample to sweep the skeleton; pause to stop it.'],
    ['02:45', '分层视差', 'Parallax', steps, '在支持滚动时间轴的宽屏浏览器滚动，只有背景点阵错速移动。', 'In a wide browser with scroll timelines, the decorative grid moves at a different rate.'],
    ['03:00', '数字递增的变体', 'Count-up adaptation', steps, '本站只滚动真实的步骤序号 01–04，不滚动金额、配额或营销数字。', 'The site rolls actual step numbers 01–04, not balances or marketing counters.'],
    ['03:25', '卡片抬升', 'Hover lift', '/home#capabilities', '悬停三色卡中任意一张，只有当前卡抬起。', 'Hover one of the three feature cards; its neighbours stay put.'],
    ['03:45', '打字显现', 'Typewriter', steps, '在宽屏切换步骤，示意代码短句分步显现；可复制的代码立即可读。', 'Switch steps on a wide screen. Only the decorative snippet types in.'],
    ['04:00', '错峰入场', 'Stagger', useCases, '宽屏从上一节滚入，同行卡片依次显现；手机不加延迟。', 'Scroll in from above on desktop; adjacent cards enter in sequence.'],
    ['04:15', '连续滚动', 'Marquee', '/home#stories', '滚到评价示例；鼠标移入或键盘聚焦即可暂停。', 'Hover or focus the example reviews to pause their scrolling tracks.'],
    ['04:35', '轻回弹', 'Spring', connect, '切换两种接入方式，选中底板略微越过目标再停稳。', 'Switch connection modes to see the selection ease past its target.'],
    ['04:55', '速度曲线', 'Easing', '/home#capabilities', '移入再离开三色卡，对比抬起和归位的减速过程。', 'Hover and leave a feature card to see its motion settle.']
  ] },
  { zh: '等待与到达', en: 'Loading & arrival', rows: [
    ['00:28', '扫光骨架屏', 'Skeleton sweep', preview, '播放公开样例；模型广场在真实请求未完成时显示同一骨架。', 'Play the sample. The real directory uses the same pending layout.'],
    ['00:50', '平滑进度', 'Smoothed progress', preview, '拖动演示时间轴，观察进度条追赶数值。真实网络长度未知时不报百分比。', 'Scrub the sample timeline. Real requests without a known total show no percentage.'],
    ['01:04', '模糊到清晰', 'Blur to focus', preview, '拖到 100% 或播到末尾，观察示例分组标题从模糊变清晰。', 'Scrub to 100% or let it finish to resolve the sample group header.']
  ] },
  { zh: '玻璃界面', en: 'Glass interfaces', rows: [
    ['00:12', '玻璃选中态', 'Glass selection', connect, '点击接入选项；这里采用同一块滑动底板，不做完整液态扭曲。', 'Switch tabs. This adaptation slides one shared surface without liquid distortion.'],
    ['00:23', '玻璃聚光卡', 'Glass spotlight', useCases, '鼠标划过场景卡，柔光、细边和轻倾斜作用在同一表面。', 'Move across a use-case card to see its light, rim and tilt together.'],
    ['00:29', '套餐光边', 'Plan highlight', plans, '登录且有可选套餐时，把焦点移入卡内。不下单，也不默认高亮最贵档。', 'Sign in and focus an available plan. No purchase is needed.'],
    ['00:39', '原位展开', 'Anchored expansion', '/home#home-main', '窄屏打开右上角菜单，按 Esc 从原位收回。', 'Open the top-right mobile menu; press Escape to close it.'],
    ['00:48', '玻璃 Dock', 'Glass dock', '/home#capabilities', '缓慢划过底部导航，当前和相邻图标依距离放大；触屏直接点。', 'Glide across the bottom navigation, or tap a destination on touch.']
  ] }
]
