// Roblox Lua API completions for Monaco editor
// Common classes, methods, properties, and enums

export interface CompletionItem {
  label: string
  kind: number // monaco.languages.CompletionItemKind
  detail?: string
  documentation?: string
  insertText: string
  insertTextRules?: number
}

// 1 = Method, 2 = Property, 9 = Enum, 14 = Keyword, 3 = Function, 11 = Class
const METHOD = 1
const PROPERTY = 2
const ENUM = 9
const KEYWORD = 14
const FUNCTION = 3
const CLASS = 11
const SNIPPET = 15

function m(label: string, detail?: string, insertText?: string): CompletionItem {
  return { label, kind: METHOD, detail, insertText: insertText || `${label}()` }
}

function p(label: string, detail?: string): CompletionItem {
  return { label, kind: PROPERTY, detail, insertText: label }
}

function e(label: string, detail?: string): CompletionItem {
  return { label, kind: ENUM, detail, insertText: label }
}

function k(label: string, insertText?: string): CompletionItem {
  return { label, kind: KEYWORD, insertText: insertText || label }
}

function f(label: string, detail?: string, insertText?: string): CompletionItem {
  return { label, kind: FUNCTION, detail, insertText: insertText || `${label}()` }
}

function c(label: string, detail?: string): CompletionItem {
  return { label, kind: CLASS, detail, insertText: label }
}

function s(label: string, detail: string, insertText: string): CompletionItem {
  return { label, kind: SNIPPET, detail, insertText, insertTextRules: 4 } // InsertAsSnippet
}

export const KEYWORDS: CompletionItem[] = [
  k('and'), k('break'), k('do'), k('else'), k('elseif'), k('end'),
  k('false'), k('for'), k('function'), k('if'), k('in'), k('local'),
  k('nil'), k('not'), k('or'), k('repeat'), k('return'), k('then'),
  k('true'), k('until'), k('while'),
  k('continue'),
  k('type'), k('typeof'), k('assert'), k('error', 'error(msg)'),
  k('pcall'), k('xpcall'), k('require'),
  k('print', 'print(...)'), k('warn', 'warn(...)'),
  k('wait', 'wait(seconds)'),
  k('spawn', 'spawn(fn)'), k('delay', 'delay(seconds, fn)'),
  k('tick'), k('time'), k('workspace'),
  k('game'), k('script'), k('_G'), k('_ENV'),
  k('pairs'), k('ipairs'), k('next'), k('select'),
  k('tonumber'), k('tostring'), k('type'), k('typeof'),
  k('setmetatable'), k('getmetatable'), k('rawget'), k('rawset'),
  k('table'), k('string'), k('math'), k('bit32'), k('task'),
]

export const CLASSES: CompletionItem[] = [
  c('Instance', 'Base class for all Roblox objects'),
  c('Vector3', '3D vector (X, Y, Z)'),
  c('Vector2', '2D vector (X, Y)'),
  c('CFrame', 'Coordinate frame (position + rotation)'),
  c('Color3', 'RGB color'),
  c('BrickColor', 'Legacy color palette'),
  c('UDim2', '2D scale + offset'),
  c('UDim', 'Scale + offset'),
  c('Rect', '2D rectangle'),
  c('Region3', '3D bounding region'),
  c('NumberRange', 'Min-max number range'),
  c('NumberSequence', 'Animated number keyframes'),
  c('NumberSequenceKeypoint', 'Keyframe for NumberSequence'),
  c('ColorSequence', 'Animated color keyframes'),
  c('ColorSequenceKeypoint', 'Keyframe for ColorSequence'),
  c('TweenInfo', 'Tween animation config'),
  c('Enum', 'Enum namespace'),
  c('Ray', 'Raycast ray'),
  c('RaycastParams', 'Raycast configuration'),
  c('OverlapParams', 'Overlap query parameters'),
  c('PhysicalProperties', 'Physics material properties'),
  c('Faces', 'Face set'),
  c('Axes', 'Axis set'),
  c('Random', 'Random number generator'),
  c('DateTime', 'Date/time representation'),
  c('tick', 'Unix timestamp'),
  c('utf8', 'UTF-8 string library'),
  c('buffer', 'Binary buffer library'),
  c('os', 'Operating system library'),
]

export const INSTANCE_MEMBERS: CompletionItem[] = [
  // Methods
  m('FindFirstChild', 'Find first child by name', "FindFirstChild(name, recursive?)"),
  m('FindFirstChildOfClass', 'Find first child of class', "FindFirstChildOfClass(className)"),
  m('GetChildren', 'Get all children'),
  m('GetDescendants', 'Get all descendants'),
  m('IsA', 'Check if instance is of class', "IsA(className)"),
  m('Clone', 'Clone this instance'),
  m('Destroy', 'Destroy this instance'),
  m('ClearAllChildren', 'Remove all children'),
  m('SetPrimaryPartCFrame', 'Set PrimaryPart CFrame'),
  m('GetPrimaryPartCFrame', 'Get PrimaryPart CFrame'),
  m('WaitForChild', 'Wait for child to exist', "WaitForChild(name, timeout?)"),
  m('GetService', 'Get service by class', "GetService(className)"),
  m('FindService', 'Find service by class'),
  m('GetPlayers', 'Get all players (Players service)'),
  m('Connect', 'Connect event', "Connect(handler)"),
  m('Wait', 'Wait for event to fire'),
  m('Fire', 'Fire event'),
  m('FireServer', 'Fire server (RemoteEvent)'),
  m('FireClient', 'Fire client (RemoteEvent)'),
  m('FireAllClients', 'Fire all clients (RemoteEvent)'),
  m('InvokeServer', 'Invoke server (RemoteFunction)'),
  m('InvokeClient', 'Invoke client (RemoteFunction)'),
  // Properties
  p('Name', 'Instance name'),
  p('Parent', 'Parent instance'),
  p('ClassName', 'Class name (read-only)'),
  p('ClassName', 'Class name'),
  p('archivable', 'Can be archived'),
  p('AbsolutePosition', 'Absolute position'),
  p('AbsoluteSize', 'Absolute size'),
  p('Position', 'Position'),
  p('Size', 'Size'),
  p('CFrame', 'Coordinate frame'),
  p('Rotation', 'Rotation'),
  p('Velocity', 'Velocity'),
  p('Anchored', 'Anchored to world'),
  p('CanCollide', 'Can collide with other parts'),
  p('CanTouch', 'Can trigger touch events'),
  p('CanQuery', 'Can be raycasted'),
  p('Massless', 'Massless physics'),
  p('Transparency', 'Transparency (0-1)'),
  p('Reflectance', 'Reflectance (0-1)'),
  p('Color', 'BrickColor'),
  p('BrickColor', 'BrickColor'),
  p('Material', 'Material'),
  p('TopSurface', 'Top surface type'),
  p('BottomSurface', 'Bottom surface type'),
  p('LeftSurface', 'Left surface type'),
  p('RightSurface', 'Right surface type'),
  p('FrontSurface', 'Front surface type'),
  p('BackSurface', 'Back surface type'),
  p('Shape', 'Part shape'),
  p('MaterialVariant', 'Material variant'),
  p('CastShadow', 'Cast shadows'),
  p('LocalTransparencyPart', 'Local transparency'),
  p('Locked', 'Locked in Studio'),
  p('Mass', 'Mass'),
  p('RootPriority', 'Root priority'),
  p('CustomPhysicalProperties', 'Custom physics'),
  // Object
  p('UniqueId', 'Unique identifier'),
  p('WorldPivot', 'World pivot'),
  p('PrimaryPart', 'Primary part'),
  // Model
  p('LevelOfDetail', 'Level of detail'),
  // BasePart
  p('AssemblyMass', 'Assembly mass'),
  p('AssemblyCenterOfMass', 'Assembly center of mass'),
  p('AssemblyLinearVelocity', 'Assembly velocity'),
  p('AssemblyAngularVelocity', 'Assembly angular velocity'),
  p('PivotOffset', 'Pivot offset'),
  // Player
  p('Character', 'Player character'),
  p('UserId', 'User ID'),
  p('DisplayName', 'Display name'),
  p('UserName', 'Username'),
  p('AccountAge', 'Account age in days'),
  p('Team', 'Current team'),
  p('TeamColor', 'Team color'),
  p('Health', 'Health'),
  p('MaxHealth', 'Max health'),
  p('WalkSpeed', 'Walk speed'),
  p('JumpPower', 'Jump power'),
  p('JumpHeight', 'Jump height'),
  p('HipHeight', 'Hip height'),
  p('AutoRotate', 'Auto rotate'),
  p('AutoJumpEnabled', 'Auto jump'),
  p('DevComputerMovementMode', 'Computer movement mode'),
  p('DevTouchMovementMode', 'Touch movement mode'),
  p('DevCameraOcclusionMode', 'Camera occlusion'),
  p('DevEnableMouseLock', 'Mouse lock'),
  p('CharacterAutoLoads', 'Auto loads character'),
  // GUI
  p('Visible', 'Visibility'),
  p('Enabled', 'Enabled'),
  p('BackgroundColor', 'Background color'),
  p('BackgroundTransparency', 'Background transparency'),
  p('BorderColor', 'Border color'),
  p('BorderSizePixel', 'Border size'),
  p('Position', 'Position'),
  p('Size', 'Size'),
  p('AnchorPoint', 'Anchor point'),
  p('LayoutOrder', 'Layout order'),
  p('ZIndex', 'Z index'),
  p('Text', 'Text content'),
  p('TextColor', 'Text color'),
  p('TextTransparency', 'Text transparency'),
  p('TextSize', 'Text size'),
  p('TextWrapped', 'Text wrapped'),
  p('TextXAlignment', 'X alignment'),
  p('TextYAlignment', 'Y alignment'),
  p('Font', 'Font'),
  p('Image', 'Image ID'),
  p('ImageColor', 'Image color'),
  p('ImageTransparency', 'Image transparency'),
  p('ScaleType', 'Scale type'),
  p('ScrollBarThickness', 'Scrollbar'),
  p('ScrollingDirection', 'Scroll direction'),
  p('CanvasSize', 'Canvas size'),
  p('CanvasPosition', 'Canvas position'),
  p('ElasticBehavior', 'Elastic behavior'),
  p('ScrollingEnabled', 'Scrolling enabled'),
  // Animation
  p('Speed', 'Animation speed'),
  p('TimePosition', 'Time position'),
  p('Length', 'Length'),
  p('IsPlaying', 'Is playing'),
  p('Looped', 'Looped'),
  p('WeightCurrent', 'Current weight'),
  p('WeightTarget', 'Target weight'),
  // Light
  p('Brightness', 'Brightness'),
  p('Color', 'Color'),
  p('Enabled', 'Enabled'),
  p('Shadows', 'Shadows'),
  p('Range', 'Range'),
  p('Angle', 'Angle'),
  p('Face', 'Face'),
  // Sound
  p('Playing', 'Playing'),
  p('Paused', 'Paused'),
  p('Volume', 'Volume'),
  p('Pitch', 'Pitch'),
  p('RollOffMaxDistance', 'Max distance'),
  p('RollOffMinDistance', 'Min distance'),
  p('RollOffMode', 'Roll-off mode'),
  p('SoundId', 'Sound ID'),
  // Camera
  p('CameraType', 'Camera type'),
  p('CameraSubject', 'Camera subject'),
  p('FieldOfView', 'Field of view'),
  p('FieldOfViewMode', 'FOV mode'),
  p('HeadScale', 'Head scale'),
  p('NearPlaneZ', 'Near plane'),
  p('CFrame', 'CFrame'),
  p('Focus', 'Focus target'),
  // Terrain
  p('MaterialColors', 'Material colors'),
  p('WaterColor', 'Water color'),
  p('WaterReflectance', 'Water reflectance'),
  p('WaterTransparency', 'Water transparency'),
  p('WaterWaveSize', 'Water wave size'),
  p('WaterWaveSpeed', 'Water wave speed'),
  // Teams
  p('AutoAssignable', 'Auto assignable'),
  p('TeamColor', 'Team color'),
]

export const ENUMS: CompletionItem[] = [
  e('Enum.Material'),
  e('Enum.PartType'),
  e('Enum.NormalId'),
  e('Enum.Axis'),
  e('Enum.FormFactor'),
  e('Enum.Style'),
  e('Enum.SurfaceType'),
  e('Enum.SurfaceAxis'),
  e('Enum.EasingStyle'),
  e('Enum.EasingDirection'),
  e('Enum.SortOrder'),
  e('Enum.FillDirection'),
  e('Enum.HorizontalAlignment'),
  e('Enum.VerticalAlignment'),
  e('Enum.TextXAlignment'),
  e('Enum.TextYAlignment'),
  e('Enum.Font'),
  e('Enum.ScaleType'),
  e('Enum.TextTruncate'),
  e('Enum.AutomaticSize'),
  e('Enum.ScrollingDirection'),
  e('Enum.ImageLabel'),
  e('Enum.KeyCode'),
  e('Enum.UserInputType'),
  e('Enum.InputType'),
  e('Enum.MouseBehavior'),
  e('Enum.MouseIcon'),
  e('Enum.CameraType'),
  e('Enum.CameraScript'),
  e('Enum.FieldOfView'),
  e('Enum.RenderFidelity'),
  e('Enum.LodMode'),
  e('Enum.HumanoidStateType'),
  e('Enum.HumanoidRigType'),
  e('Enum.RigType'),
  e('Enum.AnimationPriority'),
  e('Enum.AssetType'),
  e('Enum.AssetFetchStatus'),
  e('Enum.AudioOutputType'),
  e('Enum.BrickColor'),
  e('Enum.Material'),
  e('Enum.MeshType'),
  e('Enum.MeshPart'),
  e('Enum.ExplosionType'),
  e('Enum.ExplosionBehavior'),
  e('Enum.Style'),
  e('Enum.DataStoreRequestType'),
  e('Enum.DataStoreKeyType'),
  e('Enum.HttpRequestType'),
  e('Enum.HttpMethod'),
  e('Enum.AudioFileType'),
  e('Enum.AssetType'),
  e('Enum.Font'),
  e('Enum.FontFamily'),
  e('Enum.FontWeight'),
  e('Enum.FontStyle'),
  e('Enum.TerrainAcquisitionMethod'),
  e('Enum.TeamCreateError'),
  e('Enum.PathWaypointAction'),
  e('Enum.MovementMode'),
  e('Enum.ReservedArea'),
  e('Enum.ClientLuaAnnouncementType'),
]

export const ENUM_VALUES: Record<string, CompletionItem[]> = {
  'Enum.Material': [
    e('Plastic'), e('Wood'), e('Slate'), e('Concrete'), e('CorrodedMetal'),
    e('DiamondPlate'), e('Foil'), e('Grass'), e('Ice'), e('Marble'),
    e('Brick'), e('Sand'), e('Rock'), e('Clay'), e('Basalt'),
    e('CrackedLava'), e('Asphalt'), e('Cobblestone'), e('RockPlate'),
    e('Glacier'), e('Grass hills'), e('Pavement'), e('LeafyGrass'),
    e('Mud'), e('Ground'), e('Floor'),
    e('Fabric'), e('SmoothPlastic'), e('Metal'), e('WoodPlanks'),
    e('CorrodedMetal'), e('Net'), e('Glass'), e('Granite'),
    e('Brick'), e('Sand'), e('Rock'), e('Limestone'),
    e('Salt'), e('Powder'), e('Steel'),
    e('Neon'), e('Plastic'),
  ],
  'Enum.PartType': [
    e('Block'), e('Ball'), e('Cylinder'), e('Wedge'), e('CornerWedge'),
  ],
  'Enum.EasingStyle': [
    e('Linear'), e('Sine'), e('Quad'), e('Cubic'), e('Quart'), e('Quint'),
    e('Exponential'), e('Circular'), e('Back'), e('Bounce'), e('Elastic'),
  ],
  'Enum.EasingDirection': [
    e('In'), e('Out'), e('InOut'),
  ],
  'Enum.HumanoidStateType': [
    e('Running'), e('RunningNoPhysics'), e('Climbing'), e('GettingUp'),
    e('Jumping'), e('Freefall'), e('FallingDown'), e('Seated'),
    e('PlatformStanding'), e('Dead'), e('Swimming'), e('Physics'),
    e('Flying'), e('Landed'),
  ],
  'Enum.KeyCode': [
    e('Unknown'), e('A'), e('B'), e('C'), e('D'), e('E'), e('F'), e('G'),
    e('H'), e('I'), e('J'), e('K'), e('L'), e('M'), e('N'), e('O'),
    e('P'), e('Q'), e('R'), e('S'), e('T'), e('U'), e('V'), e('W'),
    e('X'), e('Y'), e('Z'),
    e('Zero'), e('One'), e('Two'), e('Three'), e('Four'), e('Five'),
    e('Six'), e('Seven'), e('Eight'), e('Nine'),
    e('Space'), e('Return'), e('Escape'), e('Tab'), e('Backquote'),
    e('Minus'), e('Equals'), e('LeftBracket'), e('RightBracket'),
    e('Backslash'), e('Semicolon'), e('Quote'), e('Comma'), e('Period'),
    e('Slash'),
    e('F1'), e('F2'), e('F3'), e('F4'), e('F5'), e('F6'), e('F7'),
    e('F8'), e('F9'), e('F10'), e('F11'), e('F12'),
    e('LeftShift'), e('LeftControl'), e('LeftAlt'), e('RightShift'),
    e('RightControl'), e('RightAlt'),
    e('Left'), e('Right'), e('Up'), e('Down'),
    e('Insert'), e('Delete'), e('Home'), e('End'), e('PageUp'), e('PageDown'),
    e('Print'), e('Pause'),
    e('Mouse1'), e('Mouse2'), e('Mouse3'), e('Middle'),
  ],
  'Enum.UserInputType': [
    e('MouseButton1'), e('MouseButton2'), e('MouseButton3'),
    e('MouseWheel'), e('MouseMovement'),
    e('Touch'), e('Keyboard'), e('Gamepad1'), e('Gamepad2'),
    e('Gamepad3'), e('Gamepad4'), e('Gamepad5'), e('Gamepad6'),
    e('Gamepad7'), e('Gamepad8'),
    e('DPad'), e('Thumbstick1'), e('Thumbstick2'),
    e('DPadUp'), e('DPadDown'), e('DPadLeft'), e('DPadRight'),
    e('ButtonA'), e('ButtonB'), e('ButtonX'), e('ButtonY'),
    e('ButtonLB'), e('ButtonRB'), e('ButtonLT'), e('ButtonRT'),
    e('ButtonMenu'), e('LeftThumbstick1'), e('LeftThumbstick2'),
    e('RightThumbstick1'), e('RightThumbstick2'),
  ],
  'Enum.Font': [
    e('Legacy'), e('Arial'), e('ArialBold'), e('SourceSans'),
    e('SourceSansBold'), e('SourceSansItalic'), e('SourceSansLight'),
    e('SourceSansSemibold'), e('Gotham'), e('GothamBold'),
    e('GothamBlack'), e('GothamMedium'), e('GothamSemibold'),
    e('GothamExtraBold'), e('GothamUltra'), e('Highway'),
    e('HighwayGothic'), e('BuilderSans'), e('BuilderSansBold'),
    e('BuilderSansMedium'), e('BuilderSansSemibold'), e('BuilderSansExtraBold'),
    e('BuilderSansUltraBold'), e('Ubuntu'),
  ],
  'Enum.ScaleType': [
    e('Stretch'), e('Slice'), e('Tile'), e('Fit'), e('Crop'),
  ],
  'Enum.CameraType': [
    e('Custom'), e('Fixed'), e('Watch'), e('Track'),
    e('Follow'), e('Scriptable'), e('Orbital'),
    e('Classic'), e('Custom'),
  ],
  'Enum.TextXAlignment': [
    e('Left'), e('Center'), e('Right'),
  ],
  'Enum.TextYAlignment': [
    e('Top'), e('Center'), e('Bottom'),
  ],
  'Enum.AnimationPriority': [
    e('Core'), e('Idle'), e('Movement'), e('Action'), e('Action2'),
    e('Action3'), e('Action4'), e('Facial'),
  ],
  'Enum.SurfaceType': [
    e('Smooth'), e('Glue'), e('Weld'), e('Studs'), e('Inlet'),
    e('Universal'), e('Hinge'), e('Motor'), e('SteppingMotor'),
    e('SmoothNoOutlines'),
  ],
}

export const ROBLOX_GLOBALS: CompletionItem[] = [
  c('game', 'DataModel - the game instance'),
  c('workspace', 'Workspace service'),
  c('script', 'Current script'),
  c('plugin', 'Current plugin'),
  c('_G', 'Global table'),
  c('_ENV', 'Environment'),
  f('require', 'require(moduleId)', 'require(moduleId)'),
  f('print', 'print(...)', 'print(...)'),
  f('warn', 'warn(...)', 'warn(...)'),
  f('error', 'error(msg, level)', 'error(msg, level?)'),
  f('assert', 'assert(condition, msg)', 'assert(condition, msg?)'),
  f('pcall', 'pcall(fn, ...)', 'pcall(fn, ...)'),
  f('xpcall', 'xpcall(fn, handler, ...)', 'xpcall(fn, handler, ...)'),
  f('type', 'type(value)', 'type(value)'),
  f('typeof', 'typeof(value)', 'typeof(value)'),
  f('tostring', 'tostring(value)', 'tostring(value)'),
  f('tonumber', 'tonumber(value)', 'tonumber(value)'),
  f('pairs', 'pairs(table)', 'pairs(table)'),
  f('ipairs', 'ipairs(table)', 'ipairs(table)'),
  f('next', 'next(table, index?)', 'next(table, index?)'),
  f('select', 'select(index, ...)', 'select(index, ...)'),
  f('setmetatable', 'setmetatable(t, mt)', 'setmetatable(t, mt)'),
  f('getmetatable', 'getmetatable(t)', 'getmetatable(t)'),
  f('rawget', 'rawget(t, k)', 'rawget(t, k)'),
  f('rawset', 'rawset(t, k, v)', 'rawset(t, k, v)'),
  f('wait', 'wait(seconds?)', 'wait(seconds?)'),
  f('spawn', 'spawn(fn)', 'spawn(fn)'),
  f('delay', 'delay(seconds, fn)', 'delay(seconds, fn)'),
  f('tick', 'tick()', 'tick()'),
  f('time', 'time()', 'time()'),
  f('elapsedTime', 'elapsedTime()', 'elapsedTime()'),
  f('settings', 'settings()', 'settings()'),
  f('UserSettings', 'UserSettings()', 'UserSettings()'),
  f('version', 'version()', 'version()'),
  f('utf8', 'utf8 library', 'utf8.'),
  f('buffer', 'buffer library', 'buffer.'),
  f('bit32', 'bit32 library', 'bit32.'),
  f('math', 'math library', 'math.'),
  f('string', 'string library', 'string.'),
  f('table', 'table library', 'table.'),
  f('task', 'task library', 'task.'),
  f('os', 'os library', 'os.'),
  f('raycast', 'workspace:Raycast()', 'workspace:Raycast(origin, direction, params)'),
  f('spawn', 'task.spawn()', 'task.spawn(fn)'),
  f('wait', 'task.wait()', 'task.wait(seconds?))'),
  f('delay', 'task.delay()', 'task.delay(seconds, fn)'),
  f('defer', 'task.defer()', 'task.defer(fn)'),
  f('cancel', 'task.cancel()', 'task.cancel(thread)'),
  f('desynchronize', 'task.desynchronize()', 'task.desynchronize()'),
  f('synchronize', 'task.synchronize()', 'task.synchronize()'),
  f('enumerate', 'for i,v in', 'for i, v in pairs(table) do\n\t\nend'),
  f('fori', 'for loop', 'for i = 1, 10 do\n\t\nend'),
  f('forr', 'reverse for loop', 'for i = 10, 1, -1 do\n\t\nend'),
  f('if', 'if statement', 'if condition then\n\t\nend'),
  f('ife', 'if/else statement', 'if condition then\n\t\nelse\n\t\nend'),
  f('while', 'while loop', 'while condition do\n\t\nend'),
  f('repeat', 'repeat loop', 'repeat\n\t\nuntil condition'),
  f('fn', 'function', 'function name(args)\n\t\nend'),
  f('lf', 'local function', 'local function name(args)\n\t\nend'),
  f('local', 'local variable', 'local name = value'),
]

export const SNIPPETS: CompletionItem[] = [
  s('print', 'print(...)', 'print(${1:message})'),
  s('warn', 'warn(...)', 'warn(${1:message})'),
  s('error', 'error(msg)', 'error(${1:"error message"})'),
  s('fori', 'for i = 1, n do', 'for ${1:i} = ${2:1}, ${3:10} do\n\t${0:-- body\nend'),
  s('forr', 'for i = n, 1, -1 do', 'for ${1:i} = ${2:10}, ${3:1}, -1 do\n\t${0:-- body\nend'),
  s('forp', 'for k, v in pairs(t) do', 'for ${1:k}, ${2:v} in pairs(${3:table}) do\n\t${0:-- body\nend'),
  s('fori2', 'for i, v in ipairs(t) do', 'for ${1:i}, ${2:v} in ipairs(${3:table}) do\n\t${0:-- body\nend'),
  s('while', 'while condition do', 'while ${1:condition} do\n\t${0:-- body\nend'),
  s('repeat', 'repeat until', 'repeat\n\t${0:-- body\nuntil ${1:condition}'),
  s('if', 'if then end', 'if ${1:condition} then\n\t${0:-- body\nend'),
  s('ife', 'if then else end', 'if ${1:condition} then\n\t${2:-- if true\nelse\n\t${0:-- if false\nend'),
  s('ifee', 'if elseif end', 'if ${1:condition} then\n\t${2:-- if true\nelseif ${3:condition} then\n\t${0:-- else if\nend'),
  s('fn', 'function', 'function ${1:name}(${2:params})\n\t${0:-- body\nend'),
  s('lf', 'local function', 'local function ${1:name}(${2:params})\n\t${0:-- body\nend'),
  s('local', 'local variable', 'local ${1:name} = ${2:value}'),
  s('localf', 'local function', 'local function ${1:name}(${2:params})\n\t${0:-- body\nend'),
  s('pcall', 'pcall wrapper', 'local ok, err = pcall(function()\n\t${1:-- protected code\nend)\nif not ok then\n\twarn(err)\nend'),
  s('spawn', 'spawn function', 'task.spawn(function()\n\t${0:-- async code\nend)'),
  s('wait', 'task.wait()', 'task.wait(${1:1})'),
  s('delay', 'task.delay()', 'task.delay(${1:1}, function()\n\t${0:-- delayed code\nend)'),
  s('debounce', 'Debounce pattern', 'local debounce = false\n\nlocal function ${1:name}()\n\tif debounce then return end\n\tdebounce = true\n\t${2:-- code\n\ttask.wait(${3:0.5})\n\tdebounce = false\nend'),
  s('remote', 'RemoteEvent pattern', 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ${1:RemoteEvent} = Instance.new("RemoteEvent")\n${1}.Name = "${2:EventName}"\n${1}.Parent = ReplicatedStorage\n\n${1}.OnServerEvent:Connect(function(player, ...)\n\t${0:-- handle\nend)'),
  s('connect', 'Event connection', '${1:object}.${2:Event}:Connect(function(${3:...})\n\t${0:-- handler\nend)'),
  s('waitfc', 'WaitForChild', 'local ${1:child} = ${2:parent}:WaitForChild("${3:Name}")'),
  s('ff', 'FindFirstChild', 'local ${1:child} = ${2:parent}:FindFirstChild("${3:Name}")'),
  s('getservice', 'GetService', 'local ${1:Service} = game:GetService("${2:ServiceName}")'),
  s('tween', 'TweenInfo', 'local info = TweenInfo.new(\n\t${1:1},\n\tEnum.EasingStyle.${2:Quad},\n\tEnum.EasingDirection.${3:Out}\n)\n\nlocal tween = game:GetService("TweenService"):Create(\n\t${4:instance},\n\tinfo,\n\t{${0:properties}}\n)\ntween:Play()'),
  s('raycast', 'workspace:Raycast', 'local params = RaycastParams.new()\nparams.FilterType = Enum.RaycastFilterType.Exclude\n\nlocal result = workspace:Raycast(\n\t${1:origin},\n\t${2:direction},\n\tparams\n)\n\nif result then\n\t${0:-- handle hit\nend'),
]

export function getCompletionsForLine(line: string): CompletionItem[] {
  const results: CompletionItem[] = []

  // After colon or dot — suggest instance members
  if (line.includes(':') || line.includes('.')) {
    return [...INSTANCE_MEMBERS, ...ENUMS]
  }

  // Default — suggest everything
  results.push(...KEYWORDS)
  results.push(...CLASSES)
  results.push(...ROBLOX_GLOBALS)
  results.push(...ENUMS)
  results.push(...SNIPPETS)

  return results
}
